/** Conservative quality checks: script-neutral, and never a dictionary of
 * allowed words. Names, spiritual vocabulary and legitimate Indic text survive. */
export function cleanExtractedText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isReadableText(text: string): boolean {
  const value = cleanExtractedText(text);
  if (!value || value.includes('\ufffd')) return false;
  // Repeated bars/slashes are a common cover-art OCR failure. A valid title
  // appended to that noise must not make the whole line pass the ratio checks.
  if ((value.match(/[|\\]/gu) || []).length >= 3) return false;
  const letters = value.match(/[\p{L}\p{M}]/gu) || [];
  const words = value.match(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu) || [];
  if (letters.length < 3 || letters.length / value.length < 0.48 || words.length === 0)
    return false;
  if (!words.some((word) => word.length >= 3)) return false;
  const fragments = words.filter((word) => word.length === 1 && !/^[aAiI]$/u.test(word)).length;
  const symbols = (value.match(/[^\p{L}\p{M}\p{N}\s.,;:!?()'’"“”\-–—/]/gu) || []).length;
  if (symbols / value.length > 0.12) return false;
  return words.length < 6 || fragments / words.length < 0.3;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Prefer the actual matching sentence/line, not an arbitrary slice of cover
 * noise. Unreliable old indexes remain searchable without publishing gibberish. */
export function buildSearchSnippet(content: string, query: string, page: number): string {
  const needle = cleanExtractedText(query).toLocaleLowerCase();
  if (!needle) return `Match found on page ${page}.`;

  // Normalize PDF newlines and broken hyphenation across line breaks
  const normalized = content
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '')
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2')
    .replace(/\s+/gu, ' ')
    .trim();

  const lower = normalized.toLocaleLowerCase();
  const index = lower.indexOf(needle);
  if (index === -1) return `Match found on page ${page}.`;

  // Comfortable snippet window around needle (~160-220 characters)
  const windowBefore = 70;
  const windowAfter = 140;

  let start = Math.max(0, index - windowBefore);
  let end = Math.min(normalized.length, index + needle.length + windowAfter);

  // Snap start to previous word boundary
  if (start > 0) {
    const spaceIndex = normalized.lastIndexOf(' ', start + 15);
    if (spaceIndex > 0 && spaceIndex < index) {
      start = spaceIndex + 1;
    }
  }

  // Snap end to next word boundary
  if (end < normalized.length) {
    const spaceIndex = normalized.indexOf(' ', end - 15);
    if (spaceIndex !== -1 && spaceIndex > index + needle.length) {
      end = spaceIndex;
    }
  }

  let excerptText = normalized.slice(start, end).trim();
  // Strip trailing dangling punctuation like solitary hyphens
  excerptText = excerptText.replace(/[-–—,:;]$/, '').trim();

  const prefix = start > 0 ? '… ' : '';
  const suffix = end < normalized.length ? ' …' : '';
  const excerpt = `${prefix}${excerptText}${suffix}`;

  const safe = escapeHtml(excerpt);
  const escapedQuery = escapeHtml(cleanExtractedText(query)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${escapedQuery})`, 'giu'), '<mark>$1</mark>');
}
