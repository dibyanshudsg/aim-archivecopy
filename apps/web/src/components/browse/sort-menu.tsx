'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Eye,
  HardDrive,
  Layers3,
} from 'lucide-react';
import type { SortColumn } from '@/lib/use-browse-filters';

export type SortOption = {
  id: string;
  label: string;
  helper: string;
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  Icon: typeof Calendar;
};

export const sortOptions: SortOption[] = [
  {
    id: 'newest',
    label: 'Newest first',
    helper: 'Latest public issue date',
    sort: null,
    dir: 'desc',
    Icon: Calendar,
  },
  {
    id: 'oldest',
    label: 'Oldest first',
    helper: 'Start from earlier archives',
    sort: 'date',
    dir: 'asc',
    Icon: Calendar,
  },
  {
    id: 'reads',
    label: 'Most read',
    helper: 'Popular with readers',
    sort: 'reads',
    dir: 'desc',
    Icon: Eye,
  },
  {
    id: 'title',
    label: 'Theme A-Z',
    helper: 'Visible theme, then issue title',
    sort: 'title',
    dir: 'asc',
    Icon: BookOpen,
  },
  {
    id: 'magazine',
    label: 'Magazine A-Z',
    helper: 'Group by publication name',
    sort: 'magazine',
    dir: 'asc',
    Icon: Layers3,
  },
  {
    id: 'size',
    label: 'Smallest file',
    helper: 'Lighter downloads first',
    sort: 'size',
    dir: 'asc',
    Icon: HardDrive,
  },
];

export function SortMenu({
  sort,
  dir,
  onChange,
  compact = false,
}: {
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onChange: (sort: SortColumn | null, dir: 'asc' | 'desc') => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeOption =
    sortOptions.find((option) => option.sort === sort && option.dir === dir) ??
    sortOptions[0];
  const ActiveIcon = activeOption.Icon;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-3.5 ${
          compact ? 'min-w-11 justify-center' : ''
        }`}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className={compact ? 'hidden min-[600px]:inline' : undefined}>Sort</span>
        <span className={`${compact ? 'hidden xl:inline' : 'hidden sm:inline'} max-w-28 truncate text-gray-500`}>
          {activeOption.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${compact ? 'hidden min-[600px]:block' : ''} ${
            open ? 'rotate-180 text-flame-600' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="browse-sort-menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`z-[60] overflow-hidden rounded-2xl border border-flame-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(120,84,28,0.18)] ring-1 ring-white ${
              compact
                ? 'fixed top-16 right-4 left-4 sm:top-[72px] md:absolute md:top-auto md:right-0 md:left-auto md:mt-2 md:w-[min(21rem,calc(100vw-2rem))]'
                : 'absolute left-0 mt-2 w-[min(21rem,calc(100vw-2rem))] sm:right-0 sm:left-auto'
            }`}
            role="menu"
          >
            {sortOptions.map((option) => {
              const active = option.id === activeOption.id;
              const Icon = option.Icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(option.sort, option.dir);
                    setOpen(false);
                  }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'text-flame-800'
                      : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="browse-sort-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold-50 to-flame-50"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                  <span
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-white text-flame-700 shadow-sm' : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-600">
                      {option.helper}
                    </span>
                  </span>
                  <span
                    className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-flame-500 text-white' : 'text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
