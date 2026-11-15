'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, X, ChevronDown, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchResultItem } from '@/components/search/search-result-item';
import { SearchResultSkeleton } from '@/components/search/search-result-skeleton';
import { SearchFilters } from '@/components/search/search-filters';
import { AvailabilityTabs, MobileAvailabilityMenu } from '@/components/browse/availability-tabs';
import { Pagination } from '@/components/browse/pagination';
import { fetchMagazines, searchIssues } from '@/lib/api';
import type { ApiMagazine, SearchResponse } from '@/lib/api';
import type { PublicNavigation } from '@/lib/navigation';

const SEARCH_PAGE_SIZE = 20;

interface SearchClientProps {
  navigation: PublicNavigation;
  initialMagazines?: ApiMagazine[];
}

export function SearchClient({ navigation, initialMagazines }: SearchClientProps) {
  const searchParams = useSearchParams();

  // Internal reactive states initialized from URL params
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [inputValue, setInputValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const [magazineFilter, setMagazineFilter] = useState(() => searchParams.get('magazine_id') ?? 'all');
  const [yearFrom, setYearFrom] = useState(() => searchParams.get('year_from') ?? '');
  const [yearTo, setYearTo] = useState(() => searchParams.get('year_to') ?? '');

  const [yearMode, setYearMode] = useState<'specific' | 'range'>(() => {
    const yf = searchParams.get('year_from');
    const yt = searchParams.get('year_to');
    if (yf && yt && yf === yt) return 'specific';
    return 'range';
  });
  const [specificYear, setSpecificYear] = useState(() => {
    const yf = searchParams.get('year_from');
    const yt = searchParams.get('year_to');
    if (yf && yt && yf === yt) return yf;
    return yf || yt || '';
  });

  const [availability, setAvailability] = useState<'read' | 'all' | 'subscriber'>(() => {
    const raw = searchParams.get('availability');
    return raw === 'all' ? 'all' : raw === 'subscriber' ? 'subscriber' : 'read';
  });

  const [topicScope, setTopicScope] = useState<'selection' | 'all'>('selection');
  const [expandedTopics, setExpandedTopics] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isMountedRef = useRef(false);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Scroll-to-top visibility listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 520);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync state to browser URL without full page unmounts
  const syncToUrl = useCallback((nextState: {
    q?: string;
    magazineId?: string;
    yearFrom?: string;
    yearTo?: string;
    availability?: 'read' | 'all' | 'subscriber';
  }, push = false) => {
    if (typeof window === 'undefined' || !isMountedRef.current) return;
    if (window.location.pathname !== '/search') return;

    const params = new URLSearchParams(window.location.search);
    if (nextState.q !== undefined) {
      if (nextState.q.trim()) params.set('q', nextState.q.trim());
      else params.delete('q');
    }
    if (nextState.magazineId !== undefined) {
      if (nextState.magazineId && nextState.magazineId !== 'all') params.set('magazine_id', nextState.magazineId);
      else params.delete('magazine_id');
    }
    if (nextState.yearFrom !== undefined) {
      if (nextState.yearFrom) params.set('year_from', nextState.yearFrom);
      else params.delete('year_from');
    }
    if (nextState.yearTo !== undefined) {
      if (nextState.yearTo) params.set('year_to', nextState.yearTo);
      else params.delete('year_to');
    }
    if (nextState.availability !== undefined) {
      if (nextState.availability !== 'read') params.set('availability', nextState.availability);
      else params.delete('availability');
    }

    const nextQs = params.toString();
    const nextUrl = `/search${nextQs ? `?${nextQs}` : ''}`;
    if (nextQs !== window.location.search.replace(/^\?/, '')) {
      if (push) {
        window.history.pushState(null, '', nextUrl);
      } else {
        window.history.replaceState(null, '', nextUrl);
      }
    }
  }, []);

  // Listen for browser forward/back navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextQ = params.get('q') ?? '';
      const nextMag = params.get('magazine_id') ?? 'all';
      const nextYF = params.get('year_from') ?? '';
      const nextYT = params.get('year_to') ?? '';
      const rawAvail = params.get('availability');
      const nextAvail = rawAvail === 'all' ? 'all' : rawAvail === 'subscriber' ? 'subscriber' : 'read';

      setQuery(nextQ);
      setInputValue(nextQ);
      setMagazineFilter(nextMag);
      setYearFrom(nextYF);
      setYearTo(nextYT);
      if (nextYF && nextYT && nextYF === nextYT) {
        setYearMode('specific');
        setSpecificYear(nextYF);
      } else {
        setYearMode('range');
        setSpecificYear(nextYF || nextYT || '');
      }
      setAvailability(nextAvail);
      setCurrentPage(1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state if searchParams prop updates externally
  useEffect(() => {
    const nextQ = searchParams.get('q') ?? '';
    const nextMag = searchParams.get('magazine_id') ?? 'all';
    const nextYF = searchParams.get('year_from') ?? '';
    const nextYT = searchParams.get('year_to') ?? '';
    const rawAvail = searchParams.get('availability');
    const nextAvail = rawAvail === 'all' ? 'all' : rawAvail === 'subscriber' ? 'subscriber' : 'read';

    setQuery(nextQ);
    setInputValue(nextQ);
    setMagazineFilter(nextMag);
    setYearFrom(nextYF);
    setYearTo(nextYT);
    if (nextYF && nextYT && nextYF === nextYT) {
      setYearMode('specific');
      setSpecificYear(nextYF);
    } else {
      setYearMode('range');
      setSpecificYear(nextYF || nextYT || '');
    }
    setAvailability(nextAvail);
  }, [searchParams]);

  // Debounce syncing local input to query & URL as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isMountedRef.current || window.location.pathname !== '/search') return;
      if (inputValue.trim() !== query.trim()) {
        const trimmed = inputValue.trim();
        setQuery(trimmed);
        setCurrentPage(1);
        syncToUrl({ q: trimmed });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, query, syncToUrl]);

  // Keyboard shortcut (/ or Cmd/Ctrl+K) to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [magazines, setMagazines] = useState<ApiMagazine[]>(initialMagazines ?? []);
  const [magazinesLoading, setMagazinesLoading] = useState(!initialMagazines || initialMagazines.length === 0);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);
  const initialQueryRef = useRef(Boolean(query.trim()));
  const hasRequestedSearchRef = useRef(false);

  useEffect(() => {
    if (initialMagazines && initialMagazines.length > 0) return;
    const controller = new AbortController();
    fetchMagazines(controller.signal)
      .then(setMagazines)
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMagazinesLoading(false);
      });
    return () => controller.abort();
  }, [initialMagazines]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    if (!query.trim()) {
      setResponse(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      hasRequestedSearchRef.current = true;
      searchIssues(
        {
          query: query.trim(),
          magazineId: magazineFilter !== 'all' ? magazineFilter : undefined,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          availability,
        },
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setResponse(data);
            setCurrentPage(1);
          }
        })
        .catch((reason) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : 'Search could not load. Please try again.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, initialQueryRef.current && !hasRequestedSearchRef.current ? 0 : 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, magazineFilter, yearFrom, yearTo, availability, retry]);

  useEffect(() => {
    const controller = new AbortController();
    setTopics([]);
    if (query.trim()) return () => controller.abort();
    const params = new URLSearchParams({ suggestions: '1', limit: '150', scope: topicScope });
    if (topicScope === 'selection') {
      params.set('availability', availability);
      if (magazineFilter !== 'all') params.set('magazine_id', magazineFilter);
      if (yearFrom) params.set('year_from', yearFrom);
      if (yearTo) params.set('year_to', yearTo);
    }
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { topics: [] }))
      .then((data) => {
        if (!controller.signal.aborted) setTopics(data.topics ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [query, availability, magazineFilter, yearFrom, yearTo, topicScope]);

  const handleAvailabilityChange = (val: 'read' | 'all' | 'subscriber') => {
    setAvailability(val);
    setCurrentPage(1);
    syncToUrl({ availability: val }, true);
  };

  const handleMagazineChange = (val: string) => {
    setMagazineFilter(val);
    setCurrentPage(1);
    syncToUrl({ magazineId: val }, true);
  };

  const handleYearModeChange = (mode: 'specific' | 'range') => {
    setYearMode(mode);
    setCurrentPage(1);
    if (mode === 'specific') {
      const target = specificYear || yearFrom || String(new Date().getFullYear());
      setSpecificYear(target);
      setYearFrom(target);
      setYearTo(target);
      syncToUrl({ yearFrom: target, yearTo: target }, true);
    } else {
      if (specificYear && !yearFrom && !yearTo) {
        setYearFrom(specificYear);
        setYearTo(specificYear);
      }
    }
  };

  const handleSpecificYearChange = (val: string) => {
    setSpecificYear(val);
    setYearFrom(val);
    setYearTo(val);
    setCurrentPage(1);
    syncToUrl({ yearFrom: val, yearTo: val });
  };

  const handleYearFromChange = (val: string) => {
    setYearFrom(val);
    setCurrentPage(1);
    syncToUrl({ yearFrom: val });
  };

  const handleYearToChange = (val: string) => {
    setYearTo(val);
    setCurrentPage(1);
    syncToUrl({ yearTo: val });
  };

  const handleClearFilters = () => {
    setMagazineFilter('all');
    setYearFrom('');
    setYearTo('');
    setSpecificYear('');
    setCurrentPage(1);
    syncToUrl({ magazineId: 'all', yearFrom: '', yearTo: '' }, true);
  };

  const handleTopicClick = (topic: string) => {
    setInputValue(topic);
    setQuery(topic);
    setCurrentPage(1);
    syncToUrl({ q: topic }, true);
  };

  const handleClear = () => {
    setInputValue('');
    setQuery('');
    setResponse(null);
    setCurrentPage(1);
    syncToUrl({ q: '' });
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
    setCurrentPage(1);
    syncToUrl({ q: trimmed }, true);
    inputRef.current?.blur();
  };

  const hasSearched = query.trim().length > 0;
  const total = response?.total ?? 0;
  const hasActiveFilters = magazineFilter !== 'all' || Boolean(yearFrom) || Boolean(yearTo);

  // Alphabetically sorted topics list
  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [topics],
  );

  // Group topics alphabetically with separator labels (#, A, B, C...)
  const topicGroups = useMemo(() => {
    const groups: Map<string, string[]> = new Map();
    for (const topic of sortedTopics) {
      const firstChar = topic.trim().charAt(0).toUpperCase();
      const groupKey = /^[0-9]/.test(firstChar) ? '#' : /^[A-Z]/i.test(firstChar) ? firstChar : '#';
      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(topic);
      } else {
        groups.set(groupKey, [topic]);
      }
    }
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === '#') return -1;
      if (b === '#') return 1;
      return a.localeCompare(b);
    });
    return keys.map((key) => ({
      letter: key,
      topics: groups.get(key)!,
    }));
  }, [sortedTopics]);

  // Pagination for search results (20 cards per page)
  const totalResults = response?.data.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / SEARCH_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedResults = useMemo(() => {
    if (!response?.data) return [];
    const start = (safeCurrentPage - 1) * SEARCH_PAGE_SIZE;
    return response.data.slice(start, start + SEARCH_PAGE_SIZE);
  }, [response?.data, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (resultsTopRef.current) {
      const top = resultsTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-9">
          <div className="mx-auto max-w-7xl">
            {/* Top row: Title and Subtitle on Left, 3 Availability mode buttons on Right */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                  Search the Archive
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                  Search titles, themes, topics, and indexed page text across the collection.
                </p>
              </div>

              {/* Desktop Segmented Control */}
              <div className="hidden md:block">
                <AvailabilityTabs
                  value={availability}
                  onChange={handleAvailabilityChange}
                  layoutId="search-availability-active"
                />
              </div>
            </div>

            {/* Mobile Availability Menu on Phone */}
            <div className="mt-4 md:hidden">
              <MobileAvailabilityMenu
                value={availability}
                onChange={handleAvailabilityChange}
              />
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSubmit} className="relative mt-6">
              <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search the archive"
                maxLength={500}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search a title, theme, topic, or phrase…"
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 pr-16 pl-12 text-base text-gray-900 shadow-sm transition-colors placeholder:text-gray-500 focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              />
              {inputValue ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-flame-50"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <div className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 items-center gap-1 sm:flex">
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                    /
                  </kbd>
                </div>
              )}
            </form>

            {/* Always-visible Modernized Filters Toolbar (Layered above subsequent content) */}
            <SearchFilters
              magazines={magazines}
              magazinesLoading={magazinesLoading}
              magazineFilter={magazineFilter}
              onMagazineChange={handleMagazineChange}
              yearMode={yearMode}
              onYearModeChange={handleYearModeChange}
              specificYear={specificYear}
              onSpecificYearChange={handleSpecificYearChange}
              yearFrom={yearFrom}
              onYearFromChange={handleYearFromChange}
              yearTo={yearTo}
              onYearToChange={handleYearToChange}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
              totalMatches={total}
              loading={loading}
              hasSearched={hasSearched}
            />

            {/* Available Topics Section (when no search query entered) */}
            {!hasSearched && sortedTopics.length > 0 && (
              <div className="relative z-0 mt-8">
                {/* Title + Radio buttons to choose selection scope */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                    <p className="font-heading text-sm font-bold tracking-wide text-gray-700 uppercase">
                      Available Topics
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-flame-800">
                        <input
                          type="radio"
                          name="topic-scope"
                          value="selection"
                          checked={topicScope === 'selection'}
                          onChange={() => setTopicScope('selection')}
                          className="h-3.5 w-3.5 accent-[#d97735] focus:ring-flame-400"
                        />
                        <span>In current selection</span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-flame-800">
                        <input
                          type="radio"
                          name="topic-scope"
                          value="all"
                          checked={topicScope === 'all'}
                          onChange={() => setTopicScope('all')}
                          className="h-3.5 w-3.5 accent-[#d97735] focus:ring-flame-400"
                        />
                        <span>All archive topics</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Collapsed View: first 3 rows with smooth bottom fade */}
                {!expandedTopics ? (
                  <div className="relative mt-3.5 pt-1">
                    <div className="flex max-h-[142px] flex-wrap gap-2 overflow-hidden px-1 pt-2 pb-2 transition-all duration-300">
                      {sortedTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => handleTopicClick(topic)}
                          className="inline-flex items-center rounded-full border border-flame-200/90 bg-white/90 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-flame-900 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-flame-400 hover:bg-gradient-to-r hover:from-gold-100 hover:to-flame-100 hover:text-flame-950 hover:shadow-xs active:translate-y-0"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>

                    {sortedTopics.length > 10 && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
                    )}
                  </div>
                ) : (
                  /* Expanded View: Alphabetical Separator Lines with centered letter */
                  <div className="mt-4 space-y-5 px-1">
                    {topicGroups.map((group) => (
                      <div key={group.letter}>
                        {/* Alphabet Separator Line with Centered Letter Badge */}
                        <div className="relative my-4 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-flame-100" />
                          </div>
                          <span className="relative rounded-full border border-flame-200 bg-white px-3.5 py-0.5 font-heading text-xs font-bold text-flame-800 shadow-2xs">
                            {group.letter}
                          </span>
                        </div>

                        {/* Topics under this alphabet letter */}
                        <div className="flex flex-wrap gap-2">
                          {group.topics.map((topic) => (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => handleTopicClick(topic)}
                              className="inline-flex items-center rounded-full border border-flame-200/90 bg-white/90 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-flame-900 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-flame-400 hover:bg-gradient-to-r hover:from-gold-100 hover:to-flame-100 hover:text-flame-950 hover:shadow-xs active:translate-y-0"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* View More / View Less Toggle Button */}
                {sortedTopics.length > 10 && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setExpandedTopics((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-flame-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-flame-800 shadow-2xs transition-all hover:border-flame-300 hover:bg-flame-50 hover:shadow-xs"
                    >
                      <span>{expandedTopics ? 'View less' : `View more (${sortedTopics.length} topics)`}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedTopics ? 'rotate-180 text-flame-600' : 'text-gray-500'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Search Results Area: 1 card per row on desktop and mobile */}
        <div ref={resultsTopRef} className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col gap-3.5">
              {Array.from({ length: 4 }, (_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
              <p>{error}</p>
              <button
                onClick={() => setRetry((value) => value + 1)}
                className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold"
              >
                Try again
              </button>
            </div>
          ) : hasSearched && response && total === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-700">No matches for &ldquo;{query}&rdquo; in this selection.</p>
              <p className="mt-2 text-sm text-gray-600">
                Try another phrase or change the filters. Not all editions have searchable page text yet.
              </p>
              {availability === 'read' && (
                <button
                  type="button"
                  onClick={() => handleAvailabilityChange('all')}
                  className="mt-4 rounded-lg border border-flame-300 px-4 py-3 text-sm font-semibold text-flame-800 transition-colors hover:bg-flame-50"
                >
                  Include subscriber editions
                </button>
              )}
              <Link href="/browse?availability=read" className="mt-4 block text-sm font-semibold text-flame-800 underline">
                Browse readable editions
              </Link>
            </div>
          ) : response ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {response.limited ? (
                  <p className="text-sm text-gray-600">
                    More matches may be available. Narrow your query or filters to refine the results.
                  </p>
                ) : (
                  <p className="text-sm font-medium text-gray-600">
                    {totalResults <= SEARCH_PAGE_SIZE
                      ? `${totalResults} result${totalResults !== 1 ? 's' : ''}`
                      : `${(safeCurrentPage - 1) * SEARCH_PAGE_SIZE + 1}–${Math.min(safeCurrentPage * SEARCH_PAGE_SIZE, totalResults)} of ${totalResults} results`}
                  </p>
                )}

                {/* Top Pagination if multiple pages */}
                {totalPages > 1 && (
                  <Pagination
                    current={safeCurrentPage}
                    total={totalPages}
                    onChange={handlePageChange}
                    className="mt-0"
                  />
                )}
              </div>

              {/* Single column card list (20 cards per page) */}
              <div className="flex flex-col gap-3.5">
                {pagedResults.map((result, i) => (
                  <SearchResultItem
                    key={`${result.issue_id}-${result.page_number}`}
                    result={result}
                    index={i}
                    query={query}
                  />
                ))}
              </div>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    current={safeCurrentPage}
                    total={totalPages}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Scroll-to-top floating button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Scroll to top"
              title="Scroll to top"
              className="fixed right-4 sm:right-6 md:right-8 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 md:bottom-8 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_12px_30px_rgba(190,140,46,0.28)] ring-1 ring-flame-600/20 transition-colors hover:from-gold-600 hover:to-flame-600 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
      <Footer navigation={navigation} />
    </div>
  );
}
