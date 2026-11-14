'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePdfRetry } from '@/lib/use-pdf-retry';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { LANGUAGE_NAMES, type Language } from '@aim-archive/shared';
import { cn } from '@/lib/utils';
import { configurePdfWorker } from '@/lib/pdf-worker-client';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
configurePdfWorker(pdfjs);
const PREVIEW_PAGE_LIMIT = 8;
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export default function SlideReader({
  issueId,
  pdfUrl,
  fallbackCoverUrl,
  fallbackTitle,
  magazineName,
  monthName,
  year,
  language,
  issueTheme,
  onBack,
  onOpenInfo,
}: {
  issueId: string;
  pdfUrl: string;
  fallbackCoverUrl: string | null;
  fallbackTitle: string;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
  issueTheme?: string | null;
  onBack?: () => void;
  onOpenInfo?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bookCardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  /** True at lg+ (≥1024px) — drives two-page-spread mode. */
  const isSpread = useMediaQuery('(min-width: 1024px)');
  const isPhone = useMediaQuery('(max-width: 639px)');

  const [baseBookWidth, setBaseBookWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 580;
    const available = window.innerWidth - (window.innerWidth < 640 ? 24 : 112);
    const preferred = window.innerWidth < 640
      ? available
      : window.innerWidth >= 1024
      ? Math.max(480, window.innerHeight * 1.5 - 352)
      : Math.max(230, window.innerHeight * 0.75 - 176);
    return Math.max(240, Math.round(Math.min(available, preferred)));
  });
  const [page, setPage] = useState(1);
  const pdfRetry = usePdfRetry(pdfUrl);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  /** 1 = next-page motion, -1 = prev-page motion. */
  const [pageDirection, setPageDirection] = useState(1);
  /** Flips true the first time react-pdf signals page 1 has finished rendering. */
  const [page1Rendered, setPage1Rendered] = useState(false);
  /** First-time swipe hint — shown once on mobile, then suppressed via localStorage. */
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const styles = window.getComputedStyle(scroller);
      const availableW = scroller.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const availableH = window.innerHeight - (window.innerWidth < 640 ? 150 : 180);

      let targetWidth: number;
      if (isSpread) {
        // Desktop 2-page spread: fit 2 pages side-by-side
        const maxSpreadW = availableW;
        const widthFromHeight = Math.floor((availableH / 1.414) * 2) + SPREAD_GAP_PX;
        targetWidth = Math.max(480, Math.min(maxSpreadW, widthFromHeight));
      } else {
        // Phone / Tablet single page: fit page always by default
        const maxPageW = availableW;
        const widthFromHeight = Math.floor(availableH / 1.414);
        targetWidth = Math.max(220, Math.min(maxPageW, widthFromHeight));
      }

      setBaseBookWidth(targetWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isPhone, isSpread]);

  /** Turn spread (2 pages) on desktop, single page on smaller viewports. */
  const step = isSpread ? 2 : 1;
  const previewPageCount = Math.min(numPages ?? PREVIEW_PAGE_LIMIT, PREVIEW_PAGE_LIMIT);
  const lastPageAnchor = isSpread
    ? Math.max(1, previewPageCount - ((previewPageCount - 2) % 2 === 1 ? 1 : 0))
    : previewPageCount;

  // Stable file object so react-pdf doesn't re-fetch on every render.
  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  function goPrev() {
    setPage((p) => {
      if (p <= 1) return 1;
      setPageDirection(-1);
      if (isSpread && p === 2) return 1;
      return Math.max(1, p - step);
    });
  }

  function goNext() {
    setPage((p) => {
      if (p >= lastPageAnchor) return p;
      setPageDirection(1);
      if (isSpread && p === 1) return 2;
      return Math.min(lastPageAnchor, p + step);
    });
  }

  const canGoPrev = page > 1;
  const canGoNext = page < lastPageAnchor;

  const SPREAD_GAP_PX = 8;
  const widthByColumn = baseBookWidth
    ? isSpread
      ? Math.max(120, Math.floor((baseBookWidth - SPREAD_GAP_PX) / 2))
      : baseBookWidth
    : 0;
  const perPageWidth = widthByColumn;

  // Render fresh PDF pixels for the chosen display size.
  const hiDPI =
    typeof window !== 'undefined'
      ? Math.max(2, Math.min(3, window.devicePixelRatio || 1))
      : 2;

  // Desktop & mobile default to 1.0 (100% zoom) with 10% incremental steps.
  const [zoom, setZoom] = useState(1);

  function zoomIn() {
    setZoom((z) => {
      const pct = Math.round(z * 100);
      const next = Math.min(200, Math.floor(pct / 10) * 10 + 10);
      return Math.round(next) / 100;
    });
  }
  function zoomOut() {
    setZoom((z) => {
      const pct = Math.round(z * 100);
      const prev = Math.max(50, Math.ceil(pct / 10) * 10 - 10);
      return Math.round(prev) / 100;
    });
  }
  function zoomReset() {
    setZoom(1);
  }
  const canZoomIn = zoom < 2;
  const canZoomOut = zoom > 0.5;
  const renderedPageWidth = perPageWidth ? Math.round(perPageWidth * zoom) : 0;

  // Reset page when switching issue
  useEffect(() => {
    setPage(1);
    setNumPages(null);
    setLoadError(false);
    setPage1Rendered(false);
  }, [fallbackCoverUrl, pdfUrl]);

  useEffect(() => {
    if (page > lastPageAnchor) setPage(lastPageAnchor);
  }, [lastPageAnchor, page]);

  // First-time swipe hint — mobile/tablet only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('aim-swipe-hint-shown')) return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    setShowSwipeHint(true);
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      window.localStorage.setItem('aim-swipe-hint-shown', '1');
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  function dismissSwipeHint() {
    if (!showSwipeHint) return;
    setShowSwipeHint(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aim-swipe-hint-shown', '1');
    }
  }

  function handleSwipe(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const distance = Math.abs(offset);
    const speed = Math.abs(info.velocity.x);
    draggedRef.current = distance >= 8;
    dismissSwipeHint();
    if (distance < 30 && speed < 200) return;
    if (offset < 0) goNext();
    else goPrev();
  }

  const pageLabel = (() => {
    if (page === 1) return `1 / ${previewPageCount || PREVIEW_PAGE_LIMIT}`;
    if (isSpread) {
      const right = page + 1 <= previewPageCount ? page + 1 : null;
      return right
        ? `${page}–${right} / ${previewPageCount || PREVIEW_PAGE_LIMIT}`
        : `${page} / ${previewPageCount || PREVIEW_PAGE_LIMIT}`;
    }
    return `${page} / ${previewPageCount || PREVIEW_PAGE_LIMIT}`;
  })();

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col justify-start bg-gradient-to-b from-[#fffaf1]/80 via-[#fffdf8]/60 to-[#fcf7ec]/80 pb-6 sm:pb-7"
    >
      {/* Top Header Toolbar */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-flame-100/80 bg-white/95 px-3 py-2 shadow-xs backdrop-blur-xs sm:px-6 sm:py-2.5">
        {/* Left: Back + Name card */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5 mr-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-gray-500 transition-colors hover:bg-flame-50 hover:text-flame-700 cursor-pointer"
              aria-label="Back to featured issues"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden text-xs font-semibold sm:inline">Back</span>
            </button>
          )}

          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              aria-label={`Information about ${fallbackTitle}`}
              className="group flex min-w-0 flex-1 sm:flex-initial sm:max-w-[280px] lg:max-w-md shrink items-center gap-2 rounded-xl border border-flame-100/90 bg-gradient-to-br from-white to-flame-50/40 p-1.5 text-left shadow-xs transition-colors hover:border-flame-200 hover:bg-flame-50/60 cursor-pointer sm:px-2.5"
            >
              {fallbackCoverUrl && (
                <img
                  src={fallbackCoverUrl}
                  alt=""
                  className="h-8 w-[23px] sm:h-9 sm:w-[26px] shrink-0 rounded object-cover shadow-xs ring-1 ring-flame-200/60"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-gray-900 group-hover:text-flame-800 sm:text-sm">
                  {issueTheme || magazineName}
                </span>
                <span className="block truncate text-[10px] text-gray-500 sm:text-xs">
                  {monthName} {year}
                </span>
              </span>
            </button>
          )}
        </div>

        {/* Right: Zoom controls (desktop/tablet only) + Read Issue CTA */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {!loadError && (
            <div className="hidden sm:flex items-center gap-0.5 rounded-xl border border-flame-200/70 bg-white p-0.5 shadow-xs">
              <button
                type="button"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:text-gray-300 cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                aria-label={`Zoom level ${Math.round(zoom * 100)}% — click to reset to ${isSpread ? '125%' : 'fit page'}`}
                className="min-w-[2.25rem] px-0.5 text-center text-xs font-semibold tabular-nums text-gray-700 transition-colors hover:text-flame-700 cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:text-gray-300 cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

          <Link
            href={readerPath(issueId)}
            prefetch={true}
            onClick={() => rememberReaderSource(issueId, 'shelf')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-flame-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-flame-700 cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Read Issue</span>
          </Link>
        </div>
      </header>

      {/* Book row — three flex siblings: left arrow, book card, right arrow. */}
      <div className="relative mt-4 flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 px-2 sm:px-3 lg:px-6">
        {!loadError && (
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={isSpread ? 'Previous spread' : 'Previous page'}
            className="absolute left-2 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 disabled:shadow-none lg:flex"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}

        <div ref={scrollerRef} className="flex w-full items-center overflow-x-auto overflow-y-hidden px-1 lg:px-14" style={{ justifyContent: 'safe center' }}>
        <motion.div
          ref={bookCardRef}
          style={{
            width: baseBookWidth
              ? isSpread && page === 1
                ? Math.round(perPageWidth * zoom)
                : Math.round(baseBookWidth * zoom)
              : undefined,
            minHeight: renderedPageWidth ? Math.round(renderedPageWidth * 1.414) : undefined,
            transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragStart={() => { draggedRef.current = false; }}
          onDragEnd={handleSwipe}
          onClick={() => {
            if (draggedRef.current) {
              draggedRef.current = false;
              return;
            }
            if (canGoNext) goNext();
          }}
          role="group"
          aria-label={`Preview of ${fallbackTitle}. Click or swipe to turn pages.`}
          className={cn(
            'home-preview-book relative flex min-w-0 cursor-grab items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-50 via-flame-50/60 to-gold-50 shadow-[0_8px_28px_rgba(190,140,46,0.12)] active:cursor-grabbing',
            canGoNext && 'cursor-pointer',
          )}
        >
          {/* "Magazine on a table" shadow */}
          <div className="pointer-events-none absolute inset-x-1/4 bottom-3 h-3 rounded-full bg-black/10 blur-xl" />

          {loadError ? (
            <div className={cn('relative mx-auto aspect-[3/4] max-w-md', isSpread ? 'w-[48%]' : 'w-full')}>
              <CoverFallback
                coverUrl={fallbackCoverUrl}
                magazineName={magazineName}
                monthName={monthName}
                year={year}
                language={language}
                title={fallbackTitle}
              />
            </div>
          ) : renderedPageWidth === 0 ? (
            <div className="h-full w-full" aria-hidden />
          ) : (
            <Document
              key={`${pdfUrl}:${pdfRetry.revision}`}
              file={file}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(error) => { if (!pdfRetry.retry(error)) setLoadError(true); }}
              onSourceError={(error) => { if (!pdfRetry.retry(error)) setLoadError(true); }}
              loading={null}
              className="flex h-full w-full items-center justify-center overflow-hidden"
            >
              <AnimatePresence initial={false} mode="popLayout" custom={pageDirection}>
                <motion.div
                  key={`${isSpread ? 'spread' : 'single'}-${page}`}
                  custom={pageDirection}
                  variants={{
                    enter: (direction: number) => ({
                      x: direction > 0 ? '100%' : '-100%',
                    }),
                    visible: { x: 0 },
                    exit: (direction: number) => ({
                      x: direction > 0 ? '-100%' : '100%',
                    }),
                  }}
                  initial="enter"
                  animate="visible"
                  exit="exit"
                  transition={{
                    x: { duration: reduceMotion ? 0.1 : 0.32, ease: [0.25, 1, 0.5, 1] },
                  }}
                  className={cn(
                    'flex w-full items-stretch justify-center',
                    isSpread && page > 1 ? 'gap-2' : 'gap-0',
                  )}
                >
                  <Page
                    pageNumber={page}
                    width={renderedPageWidth}
                    devicePixelRatio={hiDPI}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={() => {
                      setPage1Rendered(true);
                    }}
                    loading={
                      page === 1 && fallbackCoverUrl ? (
                        <PdfCoverImage
                          coverUrl={fallbackCoverUrl}
                          title={fallbackTitle}
                          pageWidth={renderedPageWidth}
                          decorative={false}
                          className="object-contain"
                        />
                      ) : (
                        <PageTurnSkeleton width={renderedPageWidth} />
                      )
                    }
                    className="!h-auto overflow-hidden"
                  />
                  {isSpread && numPages && page > 1 && page + 1 <= previewPageCount && (
                    <Page
                      pageNumber={page + 1}
                      width={renderedPageWidth}
                      devicePixelRatio={hiDPI}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<PageTurnSkeleton width={renderedPageWidth} />}
                      className="!h-auto overflow-hidden"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Document>
          )}

          {/* First-time swipe hint — bottom-center of the book card.
              Appears once per browser on mobile/tablet, dismisses on first
              swipe or after 4 s. Pointer-events: none so it doesn't block
              the underlying drag handler. */}
          <AnimatePresence>
            {showSwipeHint && (
              <motion.div
                key="swipe-hint"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gray-900/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
              >
                <motion.span
                  className="inline-block"
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ← Swipe to turn pages →
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
        </div>

        {!loadError && (canGoNext ? (
          <button
            type="button"
            onClick={goNext}
            aria-label={isSpread ? 'Next preview spread' : 'Next preview page'}
            className="absolute right-2 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 lg:flex"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        ) : (
          <Link
            href={readerPath(issueId)}
            prefetch={true}
            onClick={() => rememberReaderSource(issueId, 'shelf')}
            className="absolute right-2 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-2 rounded-full bg-flame-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-flame-700 hover:shadow-xl lg:flex"
          >
            <BookOpen className="h-4 w-4" /> Read issue <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>

      {/* Loading state with animated loading line while initial page is rendering */}
      {!page1Rendered && page === 1 && (
        <div className="mt-4 flex flex-col items-center gap-2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 rounded-full border border-gold-200/80 bg-white/95 px-3.5 py-1.5 shadow-xs">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-flame-600 border-t-transparent" />
            <span className="text-xs font-semibold text-flame-700">Opening preview…</span>
          </div>
          <div className="h-1 w-44 overflow-hidden rounded-full bg-gold-200/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 via-flame-500 to-gold-500"
              initial={{ x: '-100%', width: '50%' }}
              animate={{ x: '250%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Page indicator pill — centered below the book.
          Mobile/tablet: prev/next arrows live INSIDE the pill (since the
          side arrows are hidden < lg). Desktop: just the label. */}
      <div className="mt-5 flex min-h-[54px] justify-center lg:min-h-[34px]">
        {!loadError && (
          <div className="flex items-center gap-2 rounded-full border border-flame-200/60 bg-white/80 px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label={isSpread ? 'Previous spread' : 'Previous page'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <span className="font-heading px-3 text-base font-semibold tabular-nums text-gray-700">
              {pageLabel}
            </span>
            {canGoNext ? (
              <button
                type="button"
                onClick={goNext}
                aria-label={isSpread ? 'Next preview spread' : 'Next preview page'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 lg:hidden"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              </button>
            ) : (
              <Link
                href={readerPath(issueId)}
                prefetch={true}
                onClick={() => rememberReaderSource(issueId, 'shelf')}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-flame-600 px-4 text-sm font-semibold text-white shadow-md transition-colors hover:bg-flame-700 lg:hidden"
              >
                Read issue <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfLoadingSpread({
  coverUrl,
  title,
  pageWidth,
  isSpread,
  decorative = false,
}: {
  coverUrl: string;
  title: string;
  pageWidth: number;
  isSpread: boolean;
  decorative?: boolean;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className={cn(
          'flex h-full max-h-full items-center justify-center',
          isSpread ? 'gap-2' : 'gap-0',
        )}
      >
        <PdfCoverImage
          coverUrl={coverUrl}
          title={title}
          pageWidth={pageWidth}
          decorative={decorative}
        />
        {isSpread && <PageTurnSkeleton width={pageWidth} />}
      </div>
    </div>
  );
}

function PdfCoverImage({
  coverUrl,
  title,
  pageWidth,
  decorative,
  className,
}: {
  coverUrl: string;
  title: string;
  pageWidth: number;
  decorative: boolean;
  className?: string;
}) {
  const safeWidth = Math.max(160, pageWidth || 320);
  const height = Math.round(safeWidth * 1.414);
  return (
    <div
      style={{ width: safeWidth, height }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-2xl"
    >
      <Image
        src={coverUrl}
        alt={decorative ? '' : title}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className={cn('object-cover', className)}
      />
    </div>
  );
}

// ---------- Page-turn skeleton ----------
/** Magazine-page-shaped skeleton with shimmering text lines. Renders only as
 *  a fallback when no cover JPEG is available — the cover is the primary
 *  loading surface (visually identical to PDF page 1, so the swap is
 *  imperceptible). The shimmer keyframe is defined in globals.css. */
function PageTurnSkeleton({ width }: { width: number }) {
  const w = Math.max(160, width || 320);
  return (
    <div
      className="flex flex-col gap-2 rounded-md bg-white/40 p-6"
      style={{ width: w, minHeight: w * 1.35 }}
      aria-hidden
    >
      <div className="aim-shimmer-line h-4 w-1/2 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-11/12 rounded" />
      <div className="aim-shimmer-line h-2 w-10/12 rounded" />
      <div className="aim-shimmer-line h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-9/12 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-11/12 rounded" />
      <div className="aim-shimmer-line h-2 w-8/12 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-10/12 rounded" />
      <div className="aim-shimmer-line h-2 w-full rounded" />
    </div>
  );
}

function CoverFallback({
  coverUrl,
  magazineName,
  monthName,
  year,
  language,
  title,
}: {
  coverUrl: string | null;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
  title: string;
}) {
  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 540px"
        priority
      />
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="text-xs font-semibold tracking-widest text-flame-700 uppercase">
        {magazineName}
      </span>
      <span className="font-heading mt-2 text-3xl font-bold text-gray-900">
        {monthName}
      </span>
      <span className="font-heading text-4xl font-bold text-flame-600">
        {year}
      </span>
      <span className="mt-2 text-xs text-gray-500">
        {LANGUAGE_NAMES[language]}
      </span>
    </div>
  );
}
