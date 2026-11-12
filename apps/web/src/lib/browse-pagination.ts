export interface BrowsePageRange {
  offset: number;
  limit: number;
}

/**
 * Keeps the normal page-size target, then extends a page only when consecutive
 * issues from its final year can finish the current card row.
 */
export function buildRowFilledPageRanges(
  orderedYears: number[],
  pageSize: number,
  rowSize: number,
): BrowsePageRange[] {
  if (orderedYears.length === 0 || pageSize < 1 || rowSize < 2) return [];

  const ranges: BrowsePageRange[] = [];
  let offset = 0;

  while (offset < orderedYears.length) {
    let end = Math.min(offset + pageSize, orderedYears.length);

    if (end < orderedYears.length) {
      const finalYear = orderedYears[end - 1];
      let finalYearStart = end - 1;
      while (finalYearStart > offset && orderedYears[finalYearStart - 1] === finalYear) {
        finalYearStart -= 1;
      }

      const visibleFinalYearIssues = end - finalYearStart;
      const missingCardSlots = (rowSize - (visibleFinalYearIssues % rowSize)) % rowSize;
      let added = 0;

      while (
        added < missingCardSlots &&
        end + added < orderedYears.length &&
        orderedYears[end + added] === finalYear
      ) {
        added += 1;
      }

      end += added;
    }

    ranges.push({ offset, limit: end - offset });
    offset = end;
  }

  return ranges;
}
