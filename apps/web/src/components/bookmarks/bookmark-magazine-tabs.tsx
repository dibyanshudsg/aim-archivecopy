'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers3, ChevronDown, Check } from 'lucide-react';

export type BookmarkMagazineFilter = 'all' | 'aim' | 'agnishikha';

export const bookmarkMagazineOptions = [
  {
    id: 'aim' as BookmarkMagazineFilter,
    label: 'All India Magazine',
    helper: 'English journal',
    Icon: BookOpen,
  },
  {
    id: 'agnishikha' as BookmarkMagazineFilter,
    label: 'Agnishikha',
    helper: 'Hindi journal',
    Icon: BookOpen,
  },
  {
    id: 'all' as BookmarkMagazineFilter,
    label: 'All',
    helper: 'All publications',
    Icon: Layers3,
  },
] satisfies Array<{
  id: BookmarkMagazineFilter;
  label: string;
  helper: string;
  Icon: typeof BookOpen;
}>;

export function MobileBookmarkMagazineMenu({
  value,
  onChange,
}: {
  value: BookmarkMagazineFilter;
  onChange: (val: BookmarkMagazineFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = bookmarkMagazineOptions.find((opt) => opt.id === value) ?? bookmarkMagazineOptions[2];
  const SelectedIcon = selected.Icon;

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative z-30">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Publication filter: ${selected.label}`}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-flame-200 bg-white px-3 text-left text-gray-800 shadow-sm transition-colors hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flame-50 text-flame-700">
          <SelectedIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{selected.label}</span>
          <span className="block text-xs text-gray-600">{selected.helper}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-flame-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Publication filter"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-flame-100 bg-white p-1.5 shadow-[0_14px_36px_rgba(120,84,28,0.14)]"
          >
            {bookmarkMagazineOptions.map(({ id, label, helper, Icon }) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={value === id}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors ${
                  value === id ? 'bg-flame-50 text-flame-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-flame-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-gray-600">{helper}</span>
                </span>
                {value === id && <Check className="h-4 w-4 text-flame-700" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BookmarkMagazineTabs({
  value,
  onChange,
  layoutId = 'bookmark-magazine-active',
}: {
  value: BookmarkMagazineFilter;
  onChange: (val: BookmarkMagazineFilter) => void;
  layoutId?: string;
}) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-flame-100 bg-white/90 p-1.5 shadow-[0_12px_34px_rgba(120,84,28,0.10)] ring-1 ring-white sm:w-[492px] sm:shrink-0">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {bookmarkMagazineOptions.map(({ id, label, helper, Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={active}
              className={`relative isolate flex h-[52px] min-w-0 items-center justify-start gap-2 overflow-hidden rounded-xl px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-[58px] sm:flex-col sm:justify-center sm:gap-0.5 sm:px-2 sm:text-center ${
                active ? 'text-white' : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_10px_24px_rgba(190,140,46,0.24)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-auto sm:w-auto sm:rounded-none ${
                  active ? 'bg-white/15 text-white sm:bg-transparent' : 'bg-flame-50 text-flame-700/75 sm:bg-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 sm:flex-none">
                <span className="block truncate text-sm font-semibold leading-snug sm:inline sm:whitespace-nowrap sm:text-[13px]">
                  {label}
                </span>
                <span className={`block text-[11px] font-medium sm:hidden ${active ? 'text-white' : 'text-gray-600'}`}>
                  {helper}
                </span>
              </span>
              <span
                className={`hidden whitespace-nowrap text-[11px] font-medium leading-none sm:block ${
                  active ? 'text-white' : 'text-gray-600'
                }`}
              >
                {helper}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
