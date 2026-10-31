import { deliverCover } from '@/lib/cover-delivery';
import { publicRateLimit } from '@/lib/rate-limit';
import { createCanvas, loadImage } from 'canvas';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dominantColour(bytes: Buffer) {
  return loadImage(bytes).then((image) => {
    const canvas = createCanvas(32, 48);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>();
    for (let index = 0; index < pixels.length; index += 16) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 510;
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      if (lightness < 0.12 || lightness > 0.88 || saturation < 0.16) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1; bucket.r += r; bucket.g += g; bucket.b += b; bucket.saturation += saturation;
      } else {
        buckets.set(key, { count: 1, r, g, b, saturation });
      }
    }
    const winner = [...buckets.values()].sort((a, b) =>
      b.count * (0.65 + b.saturation / b.count) - a.count * (0.65 + a.saturation / a.count),
    )[0];
    if (!winner) return null;
    const r = Math.round(winner.r / winner.count);
    const g = Math.round(winner.g / winner.count);
    const b = Math.round(winner.b / winner.count);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return { dominant: `rgb(${r} ${g} ${b})`, foreground: luminance > 0.56 ? '#17212b' : '#fff8e8' };
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await publicRateLimit(request, 'cover');
  if (limited) return limited;
  const response = await deliverCover(request, (await params).id);
  if (!response.ok) return response;
  if (new URL(request.url).searchParams.get('palette') !== '1') {
    // Public covers may be reused briefly in this browser. CDN and admin
    // delivery remain uncached; replacements get a new URL on the homepage.
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, max-age=300');
    return new Response(response.body, { status: response.status, headers });
  }
  try {
    const palette = await dominantColour(Buffer.from(await response.arrayBuffer()));
    return Response.json(palette, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch {
    return Response.json(null, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const HEAD = GET;
