'use client';

import { normalizeIssue } from '@/lib/api';

export const BROWSE_GRID_COLUMNS = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
export const BROWSE_GRID_FULL_SPAN = 'col-span-2 sm:col-span-3 md:col-span-3 lg:col-span-4 xl:col-span-6';

export type NormalizedIssue = ReturnType<typeof normalizeIssue>;
export type BrowseGridItem =
  | { type: 'year'; year: number; key: string }
  | { type: 'issue'; issue: NormalizedIssue; index: number };

export function YearSeparator({ year }: { year: number }) {
  return (
    <div className={`${BROWSE_GRID_FULL_SPAN} py-2 sm:py-3`} aria-label={`Issues from ${year}`}>
      <div className="flex items-center gap-4">
        <span className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-transparent via-gold-300 to-flame-300 shadow-[0_1px_0_rgba(255,255,255,0.9)]" />
        <span className="relative inline-flex h-8 min-w-20 items-center justify-center rounded-full border border-flame-100 bg-white px-4 text-sm font-semibold tracking-wide text-flame-800 shadow-[0_8px_24px_rgba(120,84,28,0.08)] ring-1 ring-white">
          <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
          {year}
        </span>
        <span className="h-[2px] flex-1 rounded-full bg-gradient-to-l from-transparent via-gold-300 to-flame-300 shadow-[0_1px_0_rgba(255,255,255,0.9)]" />
      </div>
    </div>
  );
}

export function buildYearSeparatedGridItems(issues: NormalizedIssue[], showSeparators: boolean): BrowseGridItem[] {
  const items: BrowseGridItem[] = [];
  let previousYear: number | null = null;

  issues.forEach((issue, index) => {
    if (showSeparators && issue.year !== previousYear) {
      items.push({ type: 'year', year: issue.year, key: `year-${issue.year}-${index}` });
      previousYear = issue.year;
    }

    items.push({ type: 'issue', issue, index });
  });

  return items;
}
