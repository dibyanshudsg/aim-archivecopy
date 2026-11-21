'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, CheckSquare, Download, Filter, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { IssueCardSkeleton } from '@/components/magazine/issue-card-skeleton';
import { FilterPanel } from '@/components/browse/filter-panel';
import { ViewToggle } from '@/components/browse/view-toggle';
import { ActiveFilterChips } from '@/components/browse/active-filter-chips';
import { IssueListView } from '@/components/browse/issue-list-view';
import { Pagination } from '@/components/browse/pagination';
import { BulkActionBar } from '@/components/browse/bulk-action-bar';
import { BulkDownloadModal } from '@/components/browse/bulk-download-modal';
import { HeaderSearchDropdown } from '@/components/browse/header-search-dropdown';
import { SortMenu } from '@/components/browse/sort-menu';
import { BrowseContextControls } from '@/components/browse/browse-context-controls';
import {
  BookmarkMagazineTabs,
  MobileBookmarkMagazineMenu,
  type BookmarkMagazineFilter,
} from '@/components/bookmarks/bookmark-magazine-tabs';
import { ClearBookmarksModal } from '@/components/bookmarks/clear-bookmarks-modal';
import {
  YearSeparator,
  buildYearSeparatedGridItems,
  BROWSE_GRID_COLUMNS,
} from '@/components/browse/year-separator';
import { useBookmarks } from '@/lib/bookmarks-store';
import {
  fetchBookmarkedIssues,
  normalizeIssue,
  type ApiIssue,
  type ApiMagazine,
} from '@/lib/api';
import { applyFilters, sortIssues, useBrowseFilters } from '@/lib/use-browse-filters';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { downloadAsZip, type ZipDownloadProgress } from '@/lib/download-zip';
import type { BrowseFacets } from '@/lib/public-issues';
import type { PublicNavigation } from '@/lib/navigation';

const PANEL_STORAGE_KEY = 'aim-archive:bookmarks-panel:open';
const PAGE_SIZE = 24;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function computeBookmarkFacets(issues: ApiIssue[]): BrowseFacets {
  const yearsMap = new Map<number, number>();
  const monthsMap = new Map<number, number>();
  const magazinesMap = new Map<string, { label: string; count: number }>();
  const languagesMap = new Map<string, number>();
  const subjectsMap = new Map<string, number>();

  for (const issue of issues) {
    if (typeof issue.year === 'number') {
      yearsMap.set(issue.year, (yearsMap.get(issue.year) ?? 0) + 1);
    }
    if (typeof issue.month === 'number' && issue.month >= 1 && issue.month <= 12) {
      monthsMap.set(issue.month, (monthsMap.get(issue.month) ?? 0) + 1);
    }
    if (issue.magazines?.id) {
      const magId = issue.magazines.id;
      const existing = magazinesMap.get(magId);
      magazinesMap.set(magId, {
        label: issue.magazines.name,
        count: (existing?.count ?? 0) + 1,
      });
    }
    const lang = issue.magazines?.language;
    if (lang) {
      languagesMap.set(lang, (languagesMap.get(lang) ?? 0) + 1);
    }
    if (Array.isArray(issue.topics)) {
      for (const topic of issue.topics) {
        if (topic) {
          subjectsMap.set(topic, (subjectsMap.get(topic) ?? 0) + 1);
        }
      }
    }
  }

  const years = Array.from(yearsMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ value: year, label: String(year), count }));

  const months = Array.from(monthsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, count]) => ({
      value: month,
      label: MONTH_NAMES[month - 1] ?? String(month),
      count,
    }));

  const magazines = Array.from(magazinesMap.entries())
    .map(([id, data]) => ({ value: id, label: data.label, count: data.count }));

  const languages = Array.from(languagesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([lang, count]) => ({
      value: lang,
      label: lang.charAt(0).toUpperCase() + lang.slice(1),
      count,
    }));

  const subjects = Array.from(subjectsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subject, count]) => ({ value: subject, label: subject, count }));

  return { years, months, magazines, languages, subjects };
}

interface BookmarksClientProps {
  navigation: PublicNavigation;
}

export function BookmarksClient({ navigation }: BookmarksClientProps) {
  const { bookmarkedIds, clear, toggle } = useBookmarks();
  const {
    filters,
    toggleArray,
    setView,
    setSort,
    setSortChoice,
    setQuery,
    setPage,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  } = useBrowseFilters();

  const [bookmarksHydrated, setBookmarksHydrated] = useState(() =>
    typeof window !== 'undefined' ? useBookmarks.persist.hasHydrated() : false
  );
  const [allIssues, setAllIssues] = useState<ApiIssue[]>([]);
  const allIssuesRef = useRef(allIssues);
  allIssuesRef.current = allIssues;
  const [issuesLoading, setIssuesLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return useBookmarks.getState().bookmarkedIds.length > 0;
  });
  const [issuesError, setIssuesError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const manualRetryRef = useRef(false);

  const [magazineFilter, setMagazineFilter] = useState<BookmarkMagazineFilter>('all');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const [panelOpen, setPanelOpen] = useState(true);
  const [panelReady, setPanelReady] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const panelScrollRestoreRef = useRef<number | null>(null);

  const [controlsDocked, setControlsDocked] = useState(false);
  const controlsDockedRef = useRef(false);

  const gridTopRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const mobileToolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBookmarksHydrated(useBookmarks.persist.hasHydrated());
    return useBookmarks.persist.onFinishHydration(() => setBookmarksHydrated(true));
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (window.matchMedia('(max-width: 767px)').matches) setPanelOpen(false);
    else if (stored !== null) setPanelOpen(stored === 'true');
    setPanelReady(true);
  }, []);

  useEffect(() => {
    if (panelReady) localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen));
  }, [panelOpen, panelReady]);

  useLayoutEffect(() => {
    const scrollTop = panelScrollRestoreRef.current;
    if (scrollTop === null) return;
    window.scrollTo({ top: scrollTop, left: window.scrollX, behavior: 'auto' });
    panelScrollRestoreRef.current = null;
  }, [panelOpen]);

  const setPanelVisibility = useCallback((open: boolean) => {
    panelScrollRestoreRef.current = window.scrollY;
    setPanelOpen(open);
  }, []);

  useEffect(() => {
    if (!panelReady || !panelOpen) return;
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const mobile = window.matchMedia('(max-width: 767px)');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    let opened = false;
    const syncDialog = () => {
      if (mobile.matches) {
        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        opened = true;
      } else {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      }
    };
    syncDialog();
    mobile.addEventListener('change', syncDialog);
    return () => {
      mobile.removeEventListener('change', syncDialog);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('scroll'));
      if (opened) requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
        const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector<HTMLElement>('[data-filter-trigger]');
        target?.focus({ preventScroll: true });
      });
    };
  }, [panelOpen, panelReady]);

  useEffect(() => {
    let frame = 0;

    const updateScrollUi = () => {
      frame = 0;
      const activeToolbar = window.matchMedia('(max-width: 767px)').matches ? mobileToolbarRef.current : toolbarRef.current;
      const toolbarBottom = activeToolbar?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      const headerBottom =
        document.querySelector<HTMLElement>('[data-site-header]')?.getBoundingClientRect().bottom ?? 64;
      const nextDocked = toolbarBottom <= headerBottom;
      if (nextDocked !== controlsDockedRef.current) {
        controlsDockedRef.current = nextDocked;
        setControlsDocked(nextDocked);
      }
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollUi);
    };

    updateScrollUi();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!bookmarksHydrated) return;
    if (bookmarkedIds.length === 0) {
      manualRetryRef.current = false;
      setAllIssues([]);
      setIssuesError(false);
      setIssuesLoading(false);
      setChecking(false);
      setCheckMessage(null);
      return;
    }

    // If all currently bookmarked IDs are already loaded into allIssues (e.g. user just unbookmarked an issue),
    // skip the network fetch and loading screen entirely! The cards will smoothly and immediately adjust via useMemo.
    const allAlreadyLoaded =
      bookmarkedIds.length > 0 &&
      allIssuesRef.current.length > 0 &&
      bookmarkedIds.every((id) => allIssuesRef.current.some((issue) => issue.id === id));

    if (allAlreadyLoaded && !manualRetryRef.current) {
      setIssuesLoading(false);
      return;
    }

    let cancelled = false;
    const manualRetry = manualRetryRef.current;
    manualRetryRef.current = false;
    if (!manualRetry) {
      setIssuesLoading(true);
      setIssuesError(false);
    }
    fetchBookmarkedIssues(bookmarkedIds, manualRetry)
      .then((issues) => {
        if (cancelled) return;
        setAllIssues(issues);
        if (manualRetry) {
          const found = new Set(issues.map((issue) => issue.id));
          const missing = bookmarkedIds.filter((id) => !found.has(id)).length;
          setCheckMessage(missing === 0
            ? 'All saved issues are available now.'
            : `Checked again. ${missing} saved issue${missing === 1 ? ' is' : 's are'} still unavailable.`);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          if (manualRetry) setCheckMessage('Could not check right now. Your saved bookmarks are unchanged.');
          else setIssuesError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          if (manualRetry) setChecking(false);
          else setIssuesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookmarkedIds, bookmarksHydrated, retryVersion]);

  const allMagazines = useMemo<ApiMagazine[]>(() => {
    const magazines = new Map<string, ApiMagazine>();
    for (const issue of allIssues) {
      if (magazines.has(issue.magazines.id)) continue;
      magazines.set(issue.magazines.id, {
        ...issue.magazines,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      });
    }
    return [...magazines.values()];
  }, [allIssues]);

  const byId = useMemo(() => {
    const map = new Map<string, ApiIssue>();
    for (const i of allIssues) map.set(i.id, i);
    return map;
  }, [allIssues]);

  const bookmarkedIssues = useMemo(() => {
    const out: ApiIssue[] = [];
    for (const id of bookmarkedIds) {
      const issue = byId.get(id);
      if (issue) out.push(issue);
    }
    return out;
  }, [bookmarkedIds, byId]);

  const unavailableIds = useMemo(() => bookmarkedIds.filter((id) => !byId.has(id)), [bookmarkedIds, byId]);

  const facets = useMemo(() => computeBookmarkFacets(bookmarkedIssues), [bookmarkedIssues]);

  const checkAgain = () => {
    manualRetryRef.current = true;
    setCheckMessage(null);
    setChecking(true);
    setRetryVersion((version) => version + 1);
  };

  const magazineFilteredIssues = useMemo(() => {
    if (magazineFilter === 'aim') {
      return bookmarkedIssues.filter(
        (i) => i.magazines?.language === 'english' || i.magazines?.name?.toLowerCase().includes('all india'),
      );
    }
    if (magazineFilter === 'agnishikha') {
      return bookmarkedIssues.filter(
        (i) => i.magazines?.language === 'hindi' || i.magazines?.name?.toLowerCase().includes('agnishikha'),
      );
    }
    return bookmarkedIssues;
  }, [bookmarkedIssues, magazineFilter]);

  const filtered = useMemo(
    () => applyFilters(magazineFilteredIssues, filters),
    [magazineFilteredIssues, filters],
  );
  const sorted = useMemo(
    () => sortIssues(filtered, filters.sort, filters.dir),
    [filtered, filters.sort, filters.dir],
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, total);
  const paginated = useMemo(() => sorted.slice(pageStart, pageEnd), [sorted, pageStart, pageEnd]);
  const normalized = useMemo(() => paginated.map(normalizeIssue), [paginated]);

  const showYearSeparators = filters.sort === null;
  const gridItems = useMemo(
    () => buildYearSeparatedGridItems(normalized, showYearSeparators),
    [normalized, showYearSeparators],
  );

  const totalBookmarks = bookmarkedIds.length;
  const isFiltered = bookmarkedIssues.length > 0 && bookmarkedIssues.length !== sorted.length;

  const issueCountText =
    total === 0
      ? 'No saved issues'
      : total <= PAGE_SIZE
        ? `${total} saved issue${total !== 1 ? 's' : ''}`
        : `${pageStart + 1}-${pageEnd} of ${total} saved issues`;

  function handlePageChange(page: number) {
    setPage(page);
    if (gridTopRef.current) {
      const top = gridTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Bulk selection / download state
  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const selectedIds = useBulkSelection((s) => s.selectedIds);
  const enableSelection = useBulkSelection((s) => s.enable);
  const disableSelection = useBulkSelection((s) => s.disable);
  const selectAll = useBulkSelection((s) => s.selectAll);
  useEffect(() => disableSelection, [disableSelection]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [progress, setProgress] = useState<ZipDownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSelectAllVisible = () => {
    const visibleIds = paginated.map((i) => i.id);
    const everySelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (everySelected) selectAll([]);
    else selectAll(visibleIds);
  };

  const handleClearSelected = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => toggle(id));
    disableSelection();
  };

  const runDownload = async (picked: ApiIssue[]) => {
    if (picked.length === 0) return;
    const downloadable = picked.filter((i): i is ApiIssue & { pdf_url: string } => !!i.pdf_url);
    const preSkipped = picked.filter((i) => !i.pdf_url).map((i) => i.title);

    if (downloadable.length === 0) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: picked.length,
        zipPercent: 0,
        skipped: preSkipped,
        errorMessage:
          preSkipped.length > 0
            ? 'All selected bookmarks are subscriber-only until their embargo lifts.'
            : 'No files could be downloaded.',
      });
      setDownloadOpen(true);
      return;
    }

    abortRef.current = new AbortController();
    setProgress({
      phase: 'fetching',
      fetched: 0,
      total: downloadable.length,
      zipPercent: 0,
      skipped: preSkipped,
    });
    setDownloadOpen(true);
    try {
      await downloadAsZip({
        files: downloadable.map((i) => ({ name: i.title, url: i.pdf_url, sizeBytes: i.file_size_bytes })),
        zipName: `AIM Archive — ${downloadable.length} bookmark${downloadable.length === 1 ? '' : 's'}`,
        onProgress: (p) => setProgress({ ...p, skipped: [...preSkipped, ...p.skipped] }),
        signal: abortRef.current.signal,
      });
    } catch (err) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: downloadable.length,
        zipPercent: 0,
        skipped: preSkipped,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDownloadSelected = () =>
    runDownload(sorted.filter((i) => selectedIds.has(i.id)));
  const handleDownloadAll = () => runDownload(bookmarkedIssues);

  const closeDownloadModal = () => {
    setDownloadOpen(false);
    setProgress(null);
    disableSelection();
  };
  const cancelDownload = () => abortRef.current?.abort();

  const contextualControls = (
    <BrowseContextControls
      activeFilterCount={activeFilterCount}
      panelOpen={panelOpen}
      onToggleFilters={() => setPanelVisibility(!panelOpen)}
      sort={filters.sort}
      dir={filters.dir}
      onSortChange={setSortChoice}
      selectionEnabled={selectionEnabled}
      onToggleSelection={() => (selectionEnabled ? disableSelection() : enableSelection())}
      view={filters.view}
      onViewChange={setView}
    />
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        navigation={navigation}
        contextualControls={contextualControls}
        contextualControlsVisible={controlsDocked}
      />
      <main className="relative flex-1">
        <HeaderSearchDropdown query={filters.query} onQueryChange={setQuery} />

        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                My Bookmarks
              </h1>
              <p className="mt-2 text-base text-gray-600 sm:text-lg">
                {!bookmarksHydrated || issuesLoading
                  ? 'Loading saved issues…'
                  : unavailableIds.length > 0
                  ? `${bookmarkedIssues.length} of ${totalBookmarks} saved issue${totalBookmarks !== 1 ? 's' : ''} available`
                  : isFiltered
                  ? `${total} of ${totalBookmarks} saved issue${totalBookmarks !== 1 ? 's' : ''}`
                  : `${totalBookmarks} saved issue${totalBookmarks !== 1 ? 's' : ''}`}
              </p>
              <p className="mt-1 text-sm text-gray-500">Saved in this browser; not synced across devices.</p>
            </div>

            {/* Desktop Segmented Control: All India Magazine, Agnishikha, All */}
            {!issuesLoading && totalBookmarks > 0 && (
              <div className="hidden md:block">
                <BookmarkMagazineTabs
                  value={magazineFilter}
                  onChange={setMagazineFilter}
                />
              </div>
            )}
          </div>

          {/* Mobile menu on phone */}
          {!issuesLoading && totalBookmarks > 0 && (
            <div className="mt-4 md:hidden">
              <MobileBookmarkMagazineMenu
                value={magazineFilter}
                onChange={setMagazineFilter}
              />
            </div>
          )}
        </section>

        {/* Mobile Toolbar */}
        {!issuesLoading && totalBookmarks > 0 && (
          <div className="flex flex-col px-4 py-3 md:hidden">
            <div ref={mobileToolbarRef} className="flex flex-wrap items-center gap-2">
              {!panelOpen && (
                <button
                  type="button"
                  onClick={() => setPanelVisibility(true)}
                  data-filter-trigger
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3 text-sm font-medium text-flame-700 shadow-sm"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-flame-500 px-1.5 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
              <SortMenu sort={filters.sort} dir={filters.dir} onChange={setSortChoice} />
              <button
                type="button"
                onClick={handleDownloadAll}
                title="Download all"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-2xs"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => (selectionEnabled ? disableSelection() : enableSelection())}
                aria-pressed={selectionEnabled}
                aria-label={selectionEnabled ? 'Done selecting' : 'Select issues'}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600"
              >
                <CheckSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                title="Clear Saved Issues"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
              <ViewToggle view={filters.view} onChange={setView} />
              <span className="w-full text-sm font-medium text-gray-600">{issueCountText}</span>
            </div>
          </div>
        )}

        <div className="flex">
          {/* Desktop Docked Panel */}
          {!issuesLoading && totalBookmarks > 0 && (
            <motion.aside
              initial={false}
              animate={{ width: panelOpen ? 280 : 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 240, mass: 0.8 }}
              className="sticky top-20 hidden h-[calc(100vh-5rem)] shrink-0 self-start overflow-hidden md:block"
              aria-hidden={!panelOpen}
              inert={!panelOpen}
            >
              <div
                className={`absolute inset-y-0 right-0 w-[280px] border-r border-gray-100 transition-opacity duration-200 ${
                  panelOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <FilterPanel
                  facets={facets}
                  filters={filters}
                  onToggle={toggleArray}
                  onClearAll={clearAll}
                  hasActiveFilters={hasActiveFilters}
                  onClose={() => setPanelVisibility(false)}
                />
              </div>
            </motion.aside>
          )}

          {/* Mobile Filter Modal */}
          {!issuesLoading && totalBookmarks > 0 && panelOpen && (
            <dialog
              ref={filterDialogRef}
              aria-label="Bookmark filters"
              aria-modal="true"
              onCancel={(event) => { event.preventDefault(); setPanelVisibility(false); }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setPanelVisibility(false);
              }}
              className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[85vw] border-0 p-0 shadow-xl backdrop:bg-black/40 md:hidden"
            >
              <FilterPanel
                facets={facets}
                filters={filters}
                onToggle={toggleArray}
                onClearAll={clearAll}
                hasActiveFilters={hasActiveFilters}
                onClose={() => setPanelVisibility(false)}
              />
            </dialog>
          )}

          {/* Main Content Area */}
          <div ref={gridTopRef} className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {!bookmarksHydrated || issuesLoading ? (
              <BookmarksLoadingState count={bookmarkedIds.length} view={filters.view} />
            ) : issuesError ? (
              <div className="py-20 text-center" role="alert">
                <BookMarked className="mx-auto h-12 w-12 text-flame-300" />
                <p className="mt-4 text-lg font-medium text-gray-700">Couldn’t load your bookmarks</p>
                <p className="mt-2 text-sm text-gray-500">Your saved list is still intact. Try loading it again.</p>
                <button
                  type="button"
                  onClick={() => setRetryVersion((version) => version + 1)}
                  className="mt-6 rounded-xl border border-flame-200 bg-white px-5 py-2.5 text-sm font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                >
                  Try again
                </button>
              </div>
            ) : totalBookmarks === 0 ? (
              <div className="py-20 text-center">
                <BookMarked className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-700">No bookmarks yet</p>
                <p className="mt-2 text-sm text-gray-600">
                  Tap the bookmark icon on any issue to save it here
                </p>
                <Link
                  href="/browse"
                  className="mt-6 inline-block rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
                >
                  Browse Archive
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop Toolbar: Left filters, Center pagination (if >1 page), Right controls */}
                <div ref={toolbarRef} className="mb-4 hidden items-center justify-between gap-4 md:flex">
                  <div className="flex min-w-0 items-center gap-3">
                    {!panelOpen && (
                      <button
                        type="button"
                        onClick={() => setPanelVisibility(true)}
                        data-filter-trigger
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50"
                      >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                          <span className="rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    )}
                    <span className="min-w-0 truncate text-sm font-medium text-gray-600">
                      {issueCountText}
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <div className="hidden lg:flex">
                      <Pagination
                        current={currentPage}
                        total={totalPages}
                        onChange={handlePageChange}
                        className="mt-0"
                      />
                    </div>
                  )}

                  <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <SortMenu sort={filters.sort} dir={filters.dir} onChange={setSortChoice} />

                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-3.5 text-sm font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] active:scale-95"
                      title={`Download all ${totalBookmarks} bookmarks as a ZIP`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Download all</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => (selectionEnabled ? disableSelection() : enableSelection())}
                      className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
                        selectionEnabled
                          ? 'border-flame-300 bg-flame-50 text-flame-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-flame-200 hover:bg-flame-50/50 hover:text-flame-700'
                      }`}
                      aria-pressed={selectionEnabled}
                      title={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues to download or clear'}
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">{selectionEnabled ? 'Done' : 'Select'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClearConfirmOpen(true)}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      title="Clear all saved bookmarks"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span>Clear Saved Issues</span>
                    </button>

                    <ViewToggle view={filters.view} onChange={setView} />
                  </div>
                </div>

                {(checking || checkMessage) && (
                  <p role="status" aria-live="polite" className="mb-4 text-sm font-medium text-flame-800">
                    {checking ? 'Checking saved issues…' : checkMessage}
                  </p>
                )}
                {unavailableIds.length > 0 && (
                  <div role="status" className="mb-6 rounded-xl border border-flame-200 bg-flame-50 px-4 py-4 text-sm text-gray-700">
                    <p className="font-semibold text-flame-800">{unavailableIds.length} saved issue{unavailableIds.length !== 1 ? 's are' : ' is'} unavailable</p>
                    <p className="mt-1">The saved reference is still in this browser, but the issue could not be found in the public archive.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={checkAgain} disabled={checking} className="rounded-lg border border-flame-300 bg-white px-3 py-2 font-medium text-flame-800 disabled:cursor-wait disabled:opacity-60">{checking ? 'Checking…' : 'Check again'}</button>
                      <button type="button" onClick={() => unavailableIds.forEach(toggle)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium text-gray-700">Remove unavailable bookmark{unavailableIds.length !== 1 ? 's' : ''}</button>
                    </div>
                  </div>
                )}

                <ActiveFilterChips
                  filters={filters}
                  magazines={allMagazines}
                  onRemove={toggleArray}
                  onRemoveQuery={() => setQuery('')}
                  onClearAll={clearAll}
                />

                {total > 0 && (
                  <Pagination
                    current={currentPage}
                    total={totalPages}
                    onChange={handlePageChange}
                    className="mb-4 mt-0 md:hidden"
                  />
                )}

                {total === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-lg text-gray-400">
                      No bookmarks match your filters
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="mt-4 text-sm font-semibold text-flame-700 hover:text-flame-800 hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : filters.view === 'list' ? (
                  <IssueListView
                    issues={normalized}
                    sort={filters.sort}
                    dir={filters.dir}
                    onSort={setSort}
                  />
                ) : (
                  <div className={`grid ${BROWSE_GRID_COLUMNS} gap-4`}>
                    {gridItems.map((item) => (
                      item.type === 'year' ? (
                        <YearSeparator key={item.key} year={item.year} />
                      ) : (
                        <IssueCard key={item.issue.id} issue={item.issue} index={item.index} source="bookmarks" />
                      )
                    ))}
                  </div>
                )}

                {total > 0 && (
                  <Pagination
                    current={currentPage}
                    total={totalPages}
                    onChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer navigation={navigation} />

      <BulkActionBar
        issues={sorted}
        onDownload={handleDownloadSelected}
        onSelectAll={handleSelectAllVisible}
        onClearSelected={handleClearSelected}
      />
      <ClearBookmarksModal
        open={clearConfirmOpen}
        count={totalBookmarks}
        onConfirm={() => {
          clear();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
      <BulkDownloadModal
        open={downloadOpen}
        progress={progress}
        onCancel={cancelDownload}
        onClose={closeDownloadModal}
      />
    </div>
  );
}

function BookmarksLoadingState({ count, view }: { count: number; view: 'grid' | 'list' }) {
  const cardCount = Math.min(Math.max(count, 1), 12);
  if (view === 'list') {
    return (
      <div className="space-y-3" aria-label="Loading saved issues" aria-live="polite">
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid ${BROWSE_GRID_COLUMNS} gap-4`}
      aria-label="Loading saved issues"
      aria-live="polite"
    >
      {Array.from({ length: cardCount }).map((_, index) => (
        <IssueCardSkeleton key={index} />
      ))}
    </div>
  );
}
