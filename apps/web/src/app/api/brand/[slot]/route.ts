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
        headers: {
          'Cache-Control': slot === 'social' ? 'public, max-age=86400, stale-while-revalidate=604800' : 'no-cache, no-store, must-revalidate, max-age=0',
          ...(slot === 'social' ? {} : { 'Pragma': 'no-cache' }),
        },
      });
    }
    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
    if (!object.Body || object.ContentType !== 'image/png' || !object.ContentLength || object.ContentLength > 2 * 1024 * 1024) return new Response(null, { status: 404 });
    const bytes = await object.Body.transformToByteArray();
    if (bytes.length !== object.ContentLength) return new Response(null, { status: 503 });
    let image: Buffer = Buffer.from(bytes);
    // Header use needs only around 80-120 px height (40 CSS px at high density),
    // keeping proportional width to maintain aspect ratio without letterboxing or squishing.
    if (slot === 'logo') {
      const source = await loadImage(image);
      const maxHeight = 120;
      if (source.height > maxHeight) {
        const scale = maxHeight / source.height;
        const width = Math.round(source.width * scale);
        const height = maxHeight;
        const canvas = createCanvas(width, height);
        canvas.getContext('2d').drawImage(source, 0, 0, width, height);
        image = canvas.toBuffer('image/png');
      }
    }
    const cacheControl = slot === 'social'
      ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'no-cache, no-store, must-revalidate, max-age=0';

    return new Response(Buffer.from(image), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(image.length),
        'Cache-Control': cacheControl,
        ...(slot === 'social' ? {} : { 'Pragma': 'no-cache', 'Expires': '0' }),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch { return new Response(null, { status: 503 }); }
}

export const HEAD = GET;
