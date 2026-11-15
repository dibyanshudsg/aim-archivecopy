'use client';

import { CheckSquare, Filter } from 'lucide-react';
import type { SortColumn } from '@/lib/use-browse-filters';
import { SortMenu } from './sort-menu';
import { ViewToggle } from './view-toggle';

export function BrowseContextControls({
  activeFilterCount,
  panelOpen,
  onToggleFilters,
  sort,
  dir,
  onSortChange,
  selectionEnabled,
  onToggleSelection,
  view,
  onViewChange,
}: {
  activeFilterCount: number;
  panelOpen: boolean;
  onToggleFilters: () => void;
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onSortChange: (sort: SortColumn | null, dir: 'asc' | 'desc') => void;
  selectionEnabled: boolean;
  onToggleSelection: () => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex w-max shrink-0 items-center justify-between gap-0.5 min-[600px]:gap-2 sm:justify-end">
      <button
        type="button"
        onClick={onToggleFilters}
        data-filter-trigger
        aria-expanded={panelOpen}
        aria-label={panelOpen ? 'Close filters' : 'Open filters'}
        title={panelOpen ? 'Close filters' : 'Open filters'}
        className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-2.5 text-sm font-medium transition-colors sm:px-3 ${
          panelOpen
            ? 'border-flame-300 bg-flame-50 text-flame-700'
            : 'border-flame-200 bg-white text-flame-700 hover:border-flame-300 hover:bg-flame-50'
        }`}
      >
        <Filter className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-600 px-1 text-[10px] font-bold text-white sm:static sm:h-auto sm:min-w-0 sm:px-1.5 sm:py-0.5">
            {activeFilterCount > 99 ? '99+' : activeFilterCount}
          </span>
        )}
      </button>

      <SortMenu sort={sort} dir={dir} onChange={onSortChange} compact />

      <button
        type="button"
        onClick={onToggleSelection}
        className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium transition-colors xl:px-3 ${
          selectionEnabled
            ? 'border-flame-300 bg-flame-50 text-flame-700'
            : 'border-flame-200 bg-white text-flame-700 shadow-sm hover:border-flame-300 hover:bg-flame-50'
        }`}
        aria-pressed={selectionEnabled}
        aria-label={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues'}
        title={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues to download'}
      >
        <CheckSquare className="h-4 w-4 shrink-0" />
        <span className="hidden xl:inline">{selectionEnabled ? 'Done' : 'Select'}</span>
      </button>

      <ViewToggle view={view} onChange={onViewChange} compact />
    </div>
  );
}
