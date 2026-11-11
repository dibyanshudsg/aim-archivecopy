import sharp from 'sharp';

export const HERO_ARTWORK_TARGET_BYTES = 500_000;

const AVIF_QUALITIES = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40] as const;

export interface OptimizedHeroArtwork {
  bytes: Buffer;
  contentType: 'image/avif';
  extension: 'avif';
  quality: number;
  targetMet: boolean;
}

/** Keep the highest AVIF quality that meets the transfer-size target. */
export async function optimizeHeroArtwork(
  source: Buffer,
  targetBytes = HERO_ARTWORK_TARGET_BYTES,
): Promise<OptimizedHeroArtwork> {
  let smallest: { bytes: Buffer; quality: number } | null = null;

  for (const quality of AVIF_QUALITIES) {
    const bytes = await sharp(source)
      .avif({ quality, effort: 4 })
      .toBuffer();
    smallest = !smallest || bytes.length < smallest.bytes.length ? { bytes, quality } : smallest;
    if (bytes.length <= targetBytes) {
      return { bytes, contentType: 'image/avif', extension: 'avif', quality, targetMet: true };
    }
  }

  if (!smallest) throw new Error('Could not optimize hero artwork');
  return { ...smallest, contentType: 'image/avif', extension: 'avif', targetMet: false };
}
