'use client';

import { useEffect, useState } from 'react';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Download,
  Heart,
  ArrowLeft,
  FileText,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { fetchIssue, normalizeIssue, type ApiIssue } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex, Language } from '@aim-archive/shared';
import { cn, formatFileSize } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { AccessNotice } from '@/components/magazine/access-notice';
import type { PublicNavigation } from '@/lib/navigation';
import { configurePdfWorker } from '@/lib/pdf-worker-client';

interface IssueDetailClientProps {
  initialIssue: ApiIssue;
  navigation: PublicNavigation;
  relatedSection: React.ReactNode;
}

const MAX_UNLOCK_TIMER_DELAY_MS = 2_147_000_000;

function scheduleIdleWork(callback: () => void, timeout = 1_500): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 500);
  return () => clearTimeout(id);
}

export function IssueDetailClient({ initialIssue, navigation, relatedSection }: IssueDetailClientProps) {
  const { toggle, isBookmarked } = useBookmarks();
  const [apiIssue, setApiIssue] = useState(initialIssue);
  const [unlockRefreshing, setUnlockRefreshing] = useState(false);
  const issue = normalizeIssue(apiIssue);
  const [derivedPageCount, setDerivedPageCount] = useState<number | null>(issue.pageCount ?? null);
  const [pageCountLookupFailed, setPageCountLookupFailed] = useState(false);

  useEffect(() => {
    setApiIssue(initialIssue);
  }, [initialIssue]);

  // This refresh corrects stale ISR HTML and also bumps read_count for issues
  // that are already public. The API itself refuses to count embargoed reads.
  useEffect(() => {
    let cancelled = false;
    const cancelScheduledRefresh = scheduleIdleWork(() => {
      fetchIssue(issue.id, { cache: 'no-store' })
        .then((data) => {
          if (!cancelled && data) setApiIssue(data);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelScheduledRefresh();
    };
  }, [issue.id]);

  useEffect(() => {
    if (!issue.isEmbargoed || !issue.embargoLiftAt) return;

    const liftAtMs = Date.parse(issue.embargoLiftAt);
    const serverNowMs = Date.parse(issue.serverNow);
    if (!Number.isFinite(liftAtMs) || !Number.isFinite(serverNowMs)) return;

    let cancelled = false;
    let timeout: number | null = null;
    const receivedAt = performance.now();

    async function refreshUnlockedIssue() {
      setUnlockRefreshing(true);
      try {
        const data = await fetchIssue(issue.id, { cache: 'no-store' });
        if (!cancelled && data) setApiIssue(data);
      } finally {
        if (!cancelled) setUnlockRefreshing(false);
      }
    }

    function schedule() {
      const elapsedSinceServerResponse = performance.now() - receivedAt;
      const remaining = liftAtMs - serverNowMs - elapsedSinceServerResponse;
      const delay = Math.min(Math.max(remaining, 0), MAX_UNLOCK_TIMER_DELAY_MS);

      timeout = window.setTimeout(() => {
        if (cancelled) return;
        if (remaining > MAX_UNLOCK_TIMER_DELAY_MS) {
          schedule();
          return;
        }
        void refreshUnlockedIssue();
      }, delay);
    }

    schedule();
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [issue.embargoLiftAt, issue.id, issue.isEmbargoed, issue.serverNow]);

  useEffect(() => {
    if (issue.pageCount) {
      setDerivedPageCount(issue.pageCount);
      setPageCountLookupFailed(false);
      return;
    }
    if (!issue.pdfUrl || issue.isEmbargoed) {
      setDerivedPageCount(null);
      return;
    }

    const pdfUrl = issue.pdfUrl;
    let cancelled = false;
    setDerivedPageCount(null);
    setPageCountLookupFailed(false);

    async function countPages() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        configurePdfWorker(pdfjsLib);
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        try {
          if (!cancelled) setDerivedPageCount(doc.numPages);
        } finally {
          doc.destroy();
        }
      } catch {
        if (!cancelled) setPageCountLookupFailed(true);
      }
    }

    const cancelScheduledLookup = scheduleIdleWork(() => {
      void countPages();
    }, 2_000);
    return () => {
      cancelled = true;
      cancelScheduledLookup();
    };
  }, [issue.isEmbargoed, issue.pageCount, issue.pdfUrl]);

  const bookmarked = isBookmarked(issue.id);
  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const pageCountValue = derivedPageCount
    ? String(derivedPageCount)
    : issue.pdfUrl && !issue.isEmbargoed && !pageCountLookupFailed
      ? 'Loading'
      : '—';

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} />
      <main className="flex-1">
        <div className="border-b border-gray-100 bg-white/70 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2.5 text-sm">
            <Link
              href="/browse"
              prefetch={true}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700"
              aria-label="Back to browse"
              title="Back to browse"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Browse</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span lang={issue.magazine.language === 'hindi' ? 'hi' : undefined} className="truncate font-medium text-gray-800">
              {issue.title}
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-flame-100 bg-gradient-to-br from-gold-50 to-flame-50 shadow-sm">
                {issue.coverImageUrl ? (
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={issue.coverImageUrl}
                      alt={issue.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-8 py-16">
                    <span className="text-xs font-semibold tracking-widest text-flame-700 uppercase">
                      {issue.magazine.name}
                    </span>
                    <span className="font-heading mt-2 text-4xl font-bold text-gray-900">
                      {monthName}
                    </span>
                    <span className="font-heading text-5xl font-bold text-flame-600">
                      {issue.year}
                    </span>
                    <span className="mt-2 text-sm text-gray-500">
                      {LANGUAGE_NAMES[issue.magazine.language as Language]}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 lang={issue.magazine.language === 'hindi' ? 'hi' : undefined} className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                {issue.title}
              </h1>

              {issue.theme && (
                <div className="mt-3 flex items-start gap-2.5">
                  <span aria-hidden className="mt-1.5 h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500" />
                  <p lang={issue.magazine.language === 'hindi' ? 'hi' : undefined} className="font-heading pr-1 text-xl font-semibold leading-tight text-flame-700 sm:text-2xl">
                    {issue.theme}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {[...issue.topics]
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                  .map((topic, index) => (
                    <Link
                      key={`${topic}-${index}`}
                      href={`/browse?subject=${encodeURIComponent(topic)}`}
                      prefetch={true}
                      className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-3 py-1 text-sm font-medium text-flame-700 transition-colors hover:from-gold-100 hover:to-flame-100"
                    >
                      {topic}
                    </Link>
                  ))}
              </div>

              {issue.description && (
                <p className="mt-6 whitespace-pre-wrap text-justify leading-relaxed text-gray-600">
                  {issue.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Issue metadata">
                <MetaItem className="hidden sm:flex" icon={Calendar} label="Published" value={`${monthName} ${issue.year}`} />
                <MetaItem icon={FileText} label="Pages" value={pageCountValue} />
                <MetaItem icon={HardDrive} label="Size" value={formatFileSize(issue.fileSizeBytes)} />
              </div>

              {issue.isEmbargoed ? (
                <AccessNotice
                  liftLabel={issue.embargoLiftLabel}
                  magazineId={issue.magazine.id}
                  refreshing={unlockRefreshing}
                  secondaryAction={
                    <button
                      onClick={() => toggle(issue.id)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        bookmarked
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : 'border-flame-200/80 bg-white text-gray-700 hover:border-flame-300 hover:bg-flame-50/70 shadow-xs'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                      {bookmarked ? 'Bookmarked' : 'Bookmark for later'}
                    </button>
                  }
                />
              ) : (
                <div className="mt-8 flex items-center gap-2.5 sm:gap-3">
                  <Link
                    href={`/read/${issue.id}`}
                    prefetch={true}
                    className="flex min-w-0 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 sm:px-8 py-3 text-sm sm:text-base font-semibold text-white shadow-[0_12px_30px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_16px_36px_rgba(229,86,31,0.24)]"
                  >
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate">Read Online</span>
                  </Link>

                  <a
                    href={`/api/issues/${issue.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>PDF</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => toggle(issue.id)}
                    aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
                    title={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                      bookmarked
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-flame-300 hover:bg-flame-50'
                    }`}
                  >
                    <Heart className={`h-5 w-5 shrink-0 ${bookmarked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                  </button>
                </div>
              )}

              {!issue.isEmbargoed && (issue.epubUrl || issue.mobiUrl) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {[{ label: 'EPUB', url: issue.epubUrl }, { label: 'MOBI', url: issue.mobiUrl }].filter((format) => format.url).map((format) => (
                    <a key={format.label} href={format.url!} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-flame-700 hover:bg-flame-50">Download {format.label}</a>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
          {relatedSection}
        </div>
      </main>
      <Footer navigation={navigation} />
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 sm:gap-3 rounded-xl border border-gold-200/70 bg-gradient-to-br from-white to-gold-50/25 px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-xs transition-colors hover:border-gold-300", className)}>
      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-flame-50 text-flame-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs sm:text-sm font-bold leading-tight text-gray-900">{value}</p>
        <p className="text-[10px] sm:text-[11px] font-medium leading-tight text-gray-500">{label}</p>
      </div>
    </div>
  );
}
