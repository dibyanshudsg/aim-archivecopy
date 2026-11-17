'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, LockKeyhole, X } from 'lucide-react';
import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import type { HeroPickerIssue } from '@/lib/hero-picker-issue';
import { formatMonthYear } from '@/lib/utils';
import { ViewportCoverImage } from '@/components/magazine/viewport-cover-image';

interface YearOption { value: number; label: string; count: number }

interface Props {
  open: boolean;
  initialYear: number;
  issues: HeroPickerIssue[];
  heroReadyIds?: Set<string>;
  onClose: () => void;
  onSelect: (issue: HeroPickerIssue) => void;
}

export function HeroIssuePicker({ open, initialYear, issues, onClose, onSelect }: Props) {
  const [year, setYear] = useState(initialYear);
  const [yearOpen, setYearOpen] = useState(false);
  const yearOpenRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const years = useMemo<YearOption[]>(() => {
    const counts = new Map<number, number>();
    for (const issue of issues) counts.set(issue.year, (counts.get(issue.year) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => b - a).map(([value, count]) => ({ value, label: String(value), count }));
  }, [issues]);

  useEffect(() => { yearOpenRef.current = yearOpen; }, [yearOpen]);

  useEffect(() => {
    if (!open) return;
    setYear(years.some((option) => option.value === initialYear) ? initialYear : years[0]?.value ?? initialYear);
    setYearOpen(false);
  }, [open, initialYear, years]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (yearOpenRef.current) setYearOpen(false);
        else onClose();
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!yearOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !yearPickerRef.current?.contains(event.target)) setYearOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [yearOpen]);

  const months = useMemo(() => {
    const grouped = new Map<number, HeroPickerIssue[]>();
    for (const issue of issues) {
      if (issue.year === year) grouped.set(issue.month, [...(grouped.get(issue.month) ?? []), issue]);
    }
    return [...grouped].sort(([a], [b]) => b - a);
  }, [issues, year]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog" aria-modal="true" aria-labelledby="hero-issue-picker-title"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20, scale: reduceMotion ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_24px_70px_rgba(37,45,54,0.24)] sm:h-auto sm:max-h-[min(88vh,820px)] sm:max-w-3xl sm:rounded-[20px]"
          >
            <div className="relative z-20 shrink-0 border-b border-flame-100 bg-gradient-to-r from-gold-50 to-white px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="hero-issue-picker-title" className="font-heading text-2xl font-semibold text-gray-900 sm:text-3xl">Issues by date</h2>
                  <p className="mt-1 text-sm text-gray-600">Choose an edition to explore.</p>
                </div>
                <button ref={closeRef} type="button" onClick={onClose} aria-label="Close issue picker" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-flame-100 hover:text-flame-800">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div ref={yearPickerRef} className="relative mt-5 w-fit">
                <button type="button" onClick={() => setYearOpen((value) => !value)} aria-expanded={yearOpen} aria-controls="hero-year-options" className="inline-flex min-h-11 min-w-40 items-center justify-between gap-3 rounded-xl border border-flame-200 bg-white px-4 text-sm font-semibold text-flame-700 shadow-sm transition-colors hover:bg-flame-50">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />Year: {year}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${yearOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {yearOpen && <motion.div id="hero-year-options" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="absolute left-0 top-[calc(100%+0.5rem)] max-h-60 min-w-52 overflow-y-auto rounded-xl border border-flame-100 bg-white p-1.5 shadow-[0_14px_36px_rgba(84,59,30,0.16)]">
                    {years.map((option) => <button key={option.value} type="button" onClick={() => { setYear(option.value); setYearOpen(false); }} aria-current={option.value === year ? 'date' : undefined} className={`flex min-h-11 w-full items-center justify-between gap-5 rounded-lg px-3 text-sm transition-colors hover:bg-flame-50 ${option.value === year ? 'bg-flame-50 font-semibold text-flame-700' : 'text-gray-700'}`}>
                      <span>{option.label}</span><span className="inline-flex items-center gap-2 text-xs text-gray-500">{option.count}{option.value === year && <Check className="h-4 w-4 text-flame-600" aria-hidden="true" />}</span>
                    </button>)}
                  </motion.div>}
                </AnimatePresence>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5 sm:px-6">
              {months.length === 0 ? <p className="py-12 text-center text-sm text-gray-600">No published issues for this year.</p>
                  : <div className="space-y-8">{months.map(([month, monthIssues], index) => <motion.section key={`${year}-${month}`} initial={{ y: reduceMotion ? 0 : 12 }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.16) }} aria-labelledby={`picker-month-${month}`}>
                    <div className="mb-3 flex items-baseline justify-between"><h3 id={`picker-month-${month}`} className="font-heading text-xl font-semibold text-gray-900">{MONTH_NAMES[month as MonthIndex]}</h3><span className="text-xs text-gray-500">{monthIssues.length} issue{monthIssues.length === 1 ? '' : 's'}</span></div>
                    <div className="divide-y divide-flame-100 overflow-hidden rounded-xl border border-flame-100">{monthIssues.map((issue) => <IssueOption key={issue.id} issue={issue} onSelect={onSelect} />)}</div>
                  </motion.section>)}</div>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IssueOption({ issue, onSelect }: { issue: HeroPickerIssue; onSelect: (issue: HeroPickerIssue) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(issue)}
      aria-label={`View ${issue.title} in hero`}
      className="group flex min-h-24 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-flame-50/60 focus-visible:bg-flame-50/60 sm:gap-4 sm:px-4"
    >
      <span className="relative h-18 w-[54px] shrink-0 overflow-hidden rounded bg-gradient-to-br from-gold-100 to-flame-100 shadow-sm sm:h-20 sm:w-[60px]">
        {issue.cover_image_url ? (
          <ViewportCoverImage src={issue.cover_image_url} alt="" fill sizes="60px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-flame-600">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-wide text-flame-700 uppercase">{issue.magazine_name}</span>
        <span className="mt-1 block text-sm font-semibold leading-snug text-gray-900 group-hover:text-flame-800">{issue.theme || issue.title}</span>
        {issue.theme && <span className="mt-0.5 block text-xs leading-snug text-gray-600">{issue.title}</span>}
        <span className="mt-1 block text-xs text-gray-500">{formatMonthYear(issue.month, issue.year)}</span>
        <span className="mt-1 block text-[11px] font-semibold text-flame-700 sm:hidden">View</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-flame-700">
        {!issue.readable && <LockKeyhole className="h-3.5 w-3.5 text-flame-600" aria-label="Embargoed" />}
        <span className="hidden sm:inline">View</span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}
