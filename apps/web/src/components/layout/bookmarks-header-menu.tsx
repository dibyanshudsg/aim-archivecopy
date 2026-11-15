'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, X, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { useBookmarks } from '@/lib/bookmarks-store';
import { fetchBookmarkedIssues, type ApiIssue } from '@/lib/api';
import { formatMonthYear } from '@/lib/utils';
import { publicCoverRoute } from '@/lib/public-asset-routes';
import { readerPath, rememberDirectResume, rememberReaderSource } from '@/lib/reader-url';
import {
  getIssueReadingProgress,
  getReadingHistory,
  formatRelativeTime,
  type IssueReadingProgress,
} from '@/lib/reading-history';

interface BookmarksHeaderMenuProps {
  contextualControlsVisible?: boolean;
}

interface DisplayBookmarkItem {
  id: string;
  title: string;
  magazineName: string;
  month: number;
  year: number;
  coverImageUrl: string | null;
  progress: IssueReadingProgress | null;
  isEmbargoed?: boolean;
}

export function BookmarksHeaderMenu({ contextualControlsVisible = false }: BookmarksHeaderMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { bookmarkedIds, toggle } = useBookmarks();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DisplayBookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Click-outside and Escape key close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Sync and load bookmarked issues data when open or when bookmarkedIds change
  useEffect(() => {
    if (bookmarkedIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // 1. Instant local preview from reading history / cached data
    const history = getReadingHistory();
    const historyMap = new Map(history.map((h) => [h.issueId, h]));

    const localList: DisplayBookmarkItem[] = bookmarkedIds
      .map((id) => {
        const hist = historyMap.get(id);
        const progress = getIssueReadingProgress(id);
        if (hist) {
          return {
            id,
            title: hist.title,
            magazineName: hist.magazineName,
            month: hist.month,
            year: hist.year,
            coverImageUrl: hist.coverImageUrl,
            progress,
          };
        }
        return {
          id,
          title: `Issue #${id.slice(0, 8)}`,
          magazineName: 'Archive Issue',
          month: 1,
          year: 2024,
          coverImageUrl: publicCoverRoute(id),
          progress,
        };
      });

    setItems(localList);

    // 2. Fetch fresh issue metadata
    let cancelled = false;
    setLoading(true);

    fetchBookmarkedIssues(bookmarkedIds)
      .then((issues: ApiIssue[]) => {
        if (cancelled) return;
        const issueMap = new Map(issues.map((iss) => [iss.id, iss]));
        const freshList: DisplayBookmarkItem[] = bookmarkedIds.map((id) => {
          const iss = issueMap.get(id);
          const progress = getIssueReadingProgress(id);
          if (iss) {
            return {
              id,
              title: iss.title,
              magazineName: iss.magazines?.name || 'Magazine',
              month: iss.month,
              year: iss.year,
              coverImageUrl: publicCoverRoute(id, iss.updated_at),
              progress,
              isEmbargoed: iss.is_embargoed,
            };
          }
          const fallback = localList.find((l) => l.id === id);
          return fallback ?? {
            id,
            title: `Issue #${id.slice(0, 8)}`,
            magazineName: 'Archive Issue',
            month: 1,
            year: 2024,
            coverImageUrl: publicCoverRoute(id),
            progress,
          };
        });
        setItems(freshList);
      })
      .catch(() => {
        /* Keep localList on error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookmarkedIds, open]);

  const count = bookmarkedIds.length;

  function openIssue(item: DisplayBookmarkItem) {
    setOpen(false);
    rememberReaderSource(item.id, 'shelf');
    rememberDirectResume(item.id);
    const targetPage = item.progress?.page ?? 1;
    startTransition(() => {
      router.push(readerPath(item.id, targetPage));
    });
  }

  function handleRemoveBookmark(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    toggle(id);
  }

  return (
    <div className="relative shrink-0">
      {/* Mobile Bookmark Header Trigger */}
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Saved bookmarks (${count})`}
        aria-expanded={open}
        title="Saved bookmarks"
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-flame-200 bg-white text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-500 ${
          open ? 'border-flame-300 bg-flame-50 text-flame-800' : ''
        } ${contextualControlsVisible ? 'h-11 w-11' : ''}`}
      >
        <BookMarked className="h-5 w-5" />
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 380 }}
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-1 text-[10px] font-bold text-white shadow ring-1 ring-white"
            >
              {count > 99 ? '99+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Bookmarks Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute top-full right-0 z-50 mt-2 flex w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-flame-100 bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-flame-50/50 to-white px-4 py-3">
              <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-flame-600" />
                <div>
                  <h3 className="font-heading text-sm font-bold text-gray-900">
                    Saved Bookmarks
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {loading && items.length === 0
                      ? 'Loading bookmarks...'
                      : count === 0
                        ? 'No bookmarks yet'
                        : `${count} saved issue${count === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close bookmarks menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* List or Empty State */}
            {count === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flame-50 text-flame-400">
                  <BookMarked className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-800">No bookmarks saved yet</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Tap the bookmark icon on any issue to save it here for fast reading.
                </p>
              </div>
            ) : (
              <ul className="custom-scrollbar max-h-[56vh] divide-y divide-gray-100 overflow-x-hidden overflow-y-auto pr-0.5">
                {items.map((item) => (
                  <BookmarkListItem
                    key={item.id}
                    item={item}
                    onOpen={() => openIssue(item)}
                    onRemove={(e) => handleRemoveBookmark(e, item.id)}
                  />
                ))}
              </ul>
            )}

            {/* Footer View All Link */}
            <footer className="border-t border-gray-100 bg-gray-50/70 p-2.5">
              <Link
                href="/bookmarks"
                prefetch={true}
                onClick={() => setOpen(false)}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-flame-700 shadow-sm ring-1 ring-flame-200/70 transition-all hover:bg-flame-50 hover:text-flame-800 active:scale-[0.99]"
              >
                <span>View all bookmarks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookmarkListItem({
  item,
  onOpen,
  onRemove,
}: {
  item: DisplayBookmarkItem;
  onOpen: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const hasProgress = !!item.progress && item.progress.page > 0;
  const progressPct = item.progress?.progressPct ?? 0;

  return (
    <li className="group relative">
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="flex w-full items-stretch gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-flame-50/70"
      >
        {/* Cover thumbnail */}
        <div className="relative h-20 w-[58px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-50 shadow-sm ring-1 ring-black/5 transition-all duration-200 group-hover:shadow group-hover:ring-flame-300">
          {item.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverImageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-flame-700">
              {item.magazineName.slice(0, 3)}
            </div>
          )}
        </div>

        {/* Content details */}
        <div className="flex min-w-0 flex-1 flex-col justify-center pr-6">
          <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-flame-800">
            {item.title}
          </p>
          <p className="truncate text-xs text-gray-500">
            {item.magazineName} · {formatMonthYear(item.month, item.year)}
          </p>

          {/* Progress bar / unread badge */}
          {hasProgress ? (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-flame-500 transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 group-hover:text-gray-600 transition-colors">
                Page {item.progress?.page}
                {item.progress?.numPages ? ` / ${item.progress.numPages} (${progressPct}%)` : ''}
                {item.progress?.updatedAt ? ` · ${formatRelativeTime(item.progress.updatedAt)}` : ''}
              </p>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700/80">
              <BookOpen className="h-3 w-3" />
              <span>Not started yet</span>
            </div>
          )}
        </div>
      </motion.button>

      {/* Quick remove bookmark button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.title} from bookmarks`}
        title="Remove bookmark"
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-gray-400 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-600 hover:ring-red-200 focus-visible:ring-2 focus-visible:ring-flame-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
