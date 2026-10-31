import { GetObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdmin } from '@/lib/admin-auth';
import { readHeroPresentation, type HeroArtworkSlot } from '@/lib/db';
import { getR2Client, r2Bucket } from '@/lib/r2-client';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ issueId: string; slot: string }> }) {
  if (!await verifyAdmin('catalogue.view')) return new Response(null,{ status: 401 });
  const { issueId, slot } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(issueId) || (slot !== 'desktop' && slot !== 'mobile')) return new Response(null,{ status: 404 });
  try {
    const presentation = await readHeroPresentation(issueId); const record = presentation[slot as HeroArtworkSlot];
    if (!record) return new Response(null,{ status: 404 });
    const object = await getR2Client().send(new GetObjectCommand({ Bucket:r2Bucket(),Key:record.key }),{ abortSignal:AbortSignal.any([request.signal,AbortSignal.timeout(30_000)]) });
    if (!object.Body || object.ContentType !== 'image/png' || !object.ContentLength || object.ContentLength > 12*1024*1024) return new Response(null,{ status:404 });
    return new Response(object.Body.transformToWebStream(),{ headers:{ 'Content-Type':'image/png','Content-Length':String(object.ContentLength),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff' } });
  } catch { return new Response(null,{ status:503 }); }
}
