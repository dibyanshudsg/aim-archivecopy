/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const { HERO_ARTWORK_TARGET_BYTES, optimizeHeroArtwork } = await import('../src/lib/hero-artwork-compression.ts');
  const fixture = fs.readFileSync(path.resolve(__dirname, '../public/aim-oct-2026-hero.png'));
  const optimized = await optimizeHeroArtwork(fixture);
  const metadata = await sharp(optimized.bytes).metadata();

  assert.equal(optimized.contentType, 'image/avif');
  assert.equal(optimized.extension, 'avif');
  assert.equal(optimized.bytes.toString('ascii', 4, 8), 'ftyp');
  assert.equal(metadata.width, 1672);
  assert.equal(metadata.height, 941);
  assert.ok(optimized.bytes.length < fixture.length, 'optimized artwork should be smaller than its PNG source');
  assert.ok(optimized.bytes.length <= HERO_ARTWORK_TARGET_BYTES, 'representative hero artwork should meet the 500 KB target');

  console.log(`hero artwork compression passed: ${fixture.length} -> ${optimized.bytes.length} bytes at AVIF quality ${optimized.quality}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
