import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from 'canvas';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { listHeroArtworkInventory, readHeroPresentation, removeHeroArtwork, saveGlobalHeroPlacement, saveHeroArtwork, saveHeroArtworkTheme, type HeroArtworkSlot } from '@/lib/db';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';
import { z } from 'zod';
import { deleteFromR2, uploadToR2 } from '@/lib/r2-client';

export const runtime = 'nodejs';
const MAX = 8 * 1024 * 1024;
const dimensions = { desktop: [1672, 941], mobile: [941, 1672] } as const;
const validId = (value: string | null): value is string => Boolean(value && /^[A-Za-z0-9_-]{1,128}$/.test(value));
const validSlot = (value: string | null): value is HeroArtworkSlot => value === 'desktop' || value === 'mobile';

function signature(bytes: Buffer, type: string) {
  return type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
    type === 'image/webp' && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
}

function themeFor(canvas: ReturnType<typeof createCanvas>) {
  const ctx = canvas.getContext('2d');
  const x = Math.floor(canvas.width * .48), y = Math.floor(canvas.height * .12);
  const data = ctx.getImageData(x, y, canvas.width - x, Math.floor(canvas.height * .72)).data;
  let luminance = 0, r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 64) { r += data[i]; g += data[i+1]; b += data[i+2]; luminance += .2126*data[i]+.7152*data[i+1]+.0722*data[i+2]; count++; }
  const light = luminance / count > 145;
  const automatic={ mode: light ? 'dark' : 'light', text: light ? '#123b5d' : '#ffffff', mutedText: light ? '#315d78' : '#eef6fa', accent: light ? '#d89b20' : '#f3c75a', primaryBackground: light ? '#0e6a9a' : '#f4c85c', primaryForeground: light ? '#ffffff' : '#17384d', scrim: light ? 'rgba(255,255,255,0.18)' : 'rgba(4,24,39,0.28)' };
  return JSON.stringify({ ...automatic, preference:'auto', accentOverride:null, automatic, sampled: [Math.round(r/count),Math.round(g/count),Math.round(b/count)] });
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.view'); if (!admin) return adminAccessFailure();
  const params = new URL(request.url).searchParams;
  if (params.get('inventory') === '1') {
    try {
      const inventory = await listHeroArtworkInventory();
      return NextResponse.json({ inventory: inventory.map((item) => ({
        issueId: item.issueId,
        desktop: item.desktop && { ...item.desktop, key: undefined },
        mobile: item.mobile && { ...item.mobile, key: undefined },
      })) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return adminApiFailure(error, 'Could not load hero artwork library'); }
  }
  const issueId = params.get('issueId');
  if (!validId(issueId)) return NextResponse.json({ error: 'Invalid issue' }, { status: 400 });
  try { const value = await readHeroPresentation(issueId); return NextResponse.json({ desktop: value.desktop && { ...value.desktop, key: undefined }, mobile: value.mobile && { ...value.mobile, key: undefined } }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return adminApiFailure(error, 'Could not load hero artwork'); }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish'); if (!admin) return adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'upload'); if (limited) return limited;
  if (Number(request.headers.get('content-length') || 0) > MAX + 8192) return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 413 });
  let uploaded: string | null = null;
  try {
    const form = await request.formData(); const file = form.get('image'); const issueId = String(form.get('issueId') ?? ''); const slot = String(form.get('slot') ?? '');
    if (!(file instanceof File) || !validId(issueId) || !validSlot(slot) || file.size < 1 || file.size > MAX || !['image/png','image/jpeg','image/webp'].includes(file.type)) return NextResponse.json({ error: 'Choose a valid issue, slot and PNG/JPEG/WebP image under 8 MB' }, { status: 400 });
    const source = Buffer.from(await file.arrayBuffer()); if (!signature(source,file.type)) return NextResponse.json({ error: 'Image content does not match its type' }, { status: 400 });
    const image = await loadImage(source).catch(() => null); const [width,height] = dimensions[slot];
    if (!image || image.width !== width || image.height !== height) return NextResponse.json({ error: `${slot === 'desktop' ? 'Desktop' : 'Phone'} artwork must be exactly ${width} × ${height}` }, { status: 400 });
    const canvas = createCanvas(width,height); canvas.getContext('2d').drawImage(image,0,0,width,height); const normalized = canvas.toBuffer('image/png');
    const hash = createHash('sha256').update(normalized).digest('hex'); uploaded = `hero/${issueId}/${slot}/${hash}.png`;
    await uploadToR2(uploaded,normalized,'image/png');
    const old = await saveHeroArtwork(issueId,slot,{ key: uploaded,width,height,hash,theme:themeFor(canvas) },admin.id);
    if (old && old !== uploaded) await deleteFromR2(old).catch(() => undefined);
    await auditAdmin(admin.id,'hero.artwork.updated',issueId,`${slot}:${hash}`);
    return NextResponse.json({ ok: true, hash, width, height }, { status: 201 });
  } catch (error) { if (uploaded) await deleteFromR2(uploaded).catch(() => undefined); return adminApiFailure(error,'Could not upload hero artwork'); }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish'); if (!admin) return adminAccessFailure();
  const limited = await adminMutationRateLimit(request,admin.id); if (limited) return limited;
  const body = await boundedJson(request,4096); if (!body.ok) return body.response;
  const placementSchema=z.object({device:z.enum(['desktop','tablet','phone']),bookX:z.number().min(5).max(95),baselineY:z.number().min(35).max(95),bookScale:z.number().min(60).max(150),focalX:z.number().min(0).max(100),focalY:z.number().min(0).max(100)});
  const parsed = z.object({ issueId:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),slot:z.enum(['desktop','mobile']),mode:z.enum(['auto','dark','light']),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),placement:placementSchema.optional() }).safeParse(body.value);
  if(!parsed.success) return NextResponse.json({error:'Invalid theme controls',code:'VALIDATION'},{status:400});
  try {
    if(parsed.data.placement){
      const {device,...values}=parsed.data.placement;
      const placements=await saveGlobalHeroPlacement(device,values,admin.id);
      await auditAdmin(admin.id,'hero.placement.updated','global',device);
      return NextResponse.json({placements});
    }
    const current=await readHeroPresentation(parsed.data.issueId); const record=current[parsed.data.slot];
    if(!record) return NextResponse.json({error:'Upload artwork before changing its colours'},{status:409});
    const theme=JSON.parse(record.theme) as Record<string,unknown>;
    theme.preference=parsed.data.mode; theme.accentOverride=parsed.data.accent;
    const automatic=(theme.automatic&&typeof theme.automatic==='object') ? theme.automatic as Record<string,unknown> : null;
    if(parsed.data.mode==='auto'){
      if(automatic) Object.assign(theme,automatic);
      else {
        const sampled=Array.isArray(theme.sampled)?theme.sampled.map(Number):[180,180,180]; const bright=(sampled[0]+sampled[1]+sampled[2])/3>145;
        Object.assign(theme,bright?{text:'#123b5d',mutedText:'#315d78',accent:'#d89b20',primaryBackground:'#0e6a9a',primaryForeground:'#ffffff',scrim:'rgba(255,255,255,0.18)'}:{text:'#ffffff',mutedText:'#eef6fa',accent:'#f3c75a',primaryBackground:'#f4c85c',primaryForeground:'#17384d',scrim:'rgba(4,24,39,0.28)'});
      }
    }
    // Foreground preference must never alter the uploaded artwork or its
    // automatically sampled scrim. "Dark" describes the scene underneath,
    // so it needs light foregrounds; "Light" needs dark foregrounds.
    if(parsed.data.mode==='dark'){theme.text='#ffffff';theme.mutedText='#eef6fa';if(automatic?.scrim)theme.scrim=automatic.scrim;}
    if(parsed.data.mode==='light'){theme.text='#123b5d';theme.mutedText='#315d78';if(automatic?.scrim)theme.scrim=automatic.scrim;}
    if(parsed.data.accent){theme.accent=parsed.data.accent;theme.primaryBackground=parsed.data.accent;}
    const saved=await saveHeroArtworkTheme(parsed.data.issueId,parsed.data.slot,JSON.stringify(theme),admin.id);
    if(!saved) return NextResponse.json({error:'Artwork no longer exists'},{status:409});
    await auditAdmin(admin.id,'hero.theme.updated',parsed.data.issueId,`${parsed.data.slot}:${parsed.data.mode}`);
    return NextResponse.json({theme});
  } catch(error){return adminApiFailure(error,'Could not save hero colours');}
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish'); if (!admin) return adminAccessFailure();
  const limited = await adminMutationRateLimit(request,admin.id); if (limited) return limited;
  const url = new URL(request.url), issueId = url.searchParams.get('issueId'), slot = url.searchParams.get('slot');
  if (!validId(issueId) || !validSlot(slot)) return NextResponse.json({ error: 'Invalid issue or slot' }, { status: 400 });
  try { const old = await removeHeroArtwork(issueId,slot,admin.id); if (old) await deleteFromR2(old).catch(() => undefined); await auditAdmin(admin.id,'hero.artwork.removed',issueId,slot); return NextResponse.json({ ok: true }); }
  catch (error) { return adminApiFailure(error,'Could not remove hero artwork'); }
}
