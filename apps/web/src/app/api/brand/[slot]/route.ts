import { GetObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
import { BRAND_SLOTS, readBrandAssetKeys, type BrandSlot } from '@/lib/brand-assets';
import { getR2Client, r2Bucket } from '@/lib/r2-client';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (!BRAND_SLOTS.includes(slot as BrandSlot)) return new Response(null, { status: 404 });
  try {
    const key = (await readBrandAssetKeys())[slot as BrandSlot];
    if (!key) {
      const fallback = slot === 'logo' && request.method !== 'HEAD'
        ? '/_next/image?url=%2Flogo.png&w=64&q=75'
        : slot === 'favicon' ? '/icon.png' : '/logo.png';
      return NextResponse.redirect(new URL(fallback, request.url), {
        headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
      });
    }
    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
    if (!object.Body || object.ContentType !== 'image/png' || !object.ContentLength || object.ContentLength > 2 * 1024 * 1024) return new Response(null, { status: 404 });
    const bytes = await object.Body.transformToByteArray();
    if (bytes.length !== object.ContentLength) return new Response(null, { status: 503 });
    let image: Buffer = Buffer.from(bytes);
    // Older uploaded logos were stored at 512 px. Header use needs only 128 px
    // (40-56 CSS px at high density), so keep the public response small too.
    if (slot === 'logo') {
      const source = await loadImage(image);
      if (source.width > 128 || source.height > 128) {
        const canvas = createCanvas(128, 128);
        canvas.getContext('2d').drawImage(source, 0, 0, 128, 128);
        image = canvas.toBuffer('image/png');
      }
    }
    return new Response(Buffer.from(image), { headers: { 'Content-Type': 'image/png', 'Content-Length': String(image.length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}

export const HEAD = GET;
