'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Layers3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  CalendarRange,
  RotateCcw,
} from 'lucide-react';
import type { ApiMagazine } from '@/lib/api';

// ---------------------------------------------------------------------------
// 1. Magazine Dropdown Menu (Styled like Browse SortMenu)
// ---------------------------------------------------------------------------
interface SearchMagazineMenuProps {
  magazines: ApiMagazine[];
  selected: string;
  onChange: (id: string) => void;
  loading?: boolean;
}

export function SearchMagazineMenu({
  magazines,
  selected,
  onChange,
  loading = false,
}: SearchMagazineMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedMag = magazines.find((m) => m.id === selected);
  const displayLabel = selected === 'all' ? 'All magazines' : selectedMag?.name ?? 'All';

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative z-30">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loading}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 text-sm font-medium text-flame-900 shadow-2xs transition-colors hover:border-flame-300 hover:bg-flame-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-300 disabled:opacity-60"
      >
        <Layers3 className="h-4 w-4 text-flame-600" />
        <span className="text-gray-500">Magazine:</span>
        <span className="max-w-[12rem] truncate font-semibold text-gray-900 sm:max-w-xs">
          {loading ? 'Loading…' : displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-flame-600' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="search-mag-menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-flame-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(120,84,28,0.18)] ring-1 ring-white"
            role="menu"
          >
            {/* Option: All magazines */}
            <button
              type="button"
              role="menuitemradio"
              aria-checked={selected === 'all'}
              onClick={() => {
                onChange('all');
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                selected === 'all'
                  ? 'bg-flame-50 font-semibold text-flame-900'
                  : 'text-gray-700 hover:bg-flame-50/60 hover:text-flame-800'
              }`}
            >
              <div>
                <p className="leading-snug">All magazines</p>
                <p className="text-[11px] font-normal text-gray-500">Search across all publications</p>
              </div>
              {selected === 'all' && <Check className="h-4 w-4 shrink-0 text-flame-600" />}
            </button>

            {magazines.map((m) => {
              const active = selected === m.id;
              const helper =
                m.language === 'hi'
                  ? 'Hindi publication'
                  : m.language === 'english'
                    ? 'English monthly journal'
                    : `${m.language.charAt(0).toUpperCase() + m.language.slice(1)} edition`;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={`mt-0.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? 'bg-flame-50 font-semibold text-flame-900'
                      : 'text-gray-700 hover:bg-flame-50/60 hover:text-flame-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate leading-snug">{m.name}</p>
                    <p className="text-[11px] font-normal text-gray-500">{helper}</p>
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-flame-600" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Year Stepper Input (Text typing + Circular Nav Arrows + Click-and-Hold + Dropdown)
// ---------------------------------------------------------------------------
interface YearStepperInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function YearStepperInput({
  label,
  value,
  onChange,
  placeholder = 'YYYY',
  minYear = 1950,
  maxYear = 2035,
  className = '',
}: YearStepperInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopHolding = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, []);

  const step = useCallback(
    (delta: number) => {
      const current = parseInt(value, 10);
      const fallback = placeholder && !isNaN(parseInt(placeholder, 10))
        ? parseInt(placeholder, 10)
        : new Date().getFullYear();
      const nextVal = isNaN(current) ? fallback + delta : current + delta;
      const clamped = Math.min(maxYear, Math.max(minYear, nextVal));
      onChange(String(clamped));
    },
    [value, placeholder, minYear, maxYear, onChange],
  );

  const startHolding = useCallback(
    (delta: number) => {
      stopHolding();
      step(delta);
      stepTimeoutRef.current = setTimeout(() => {
        stepIntervalRef.current = setInterval(() => {
          step(delta);
        }, 80);
      }, 350);
    },
    [stopHolding, step],
  );

  useEffect(() => {
    return () => stopHolding();
  }, [stopHolding]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Generate milestone years for quick selection
  const currentYear = new Date().getFullYear();
  const quickYears: number[] = [];
  for (let y = currentYear; y >= 1970; y -= 1) {
    quickYears.push(y);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    onChange(raw);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center transition-[z-index] ${
        dropdownOpen ? 'z-50' : 'z-20'
      } ${className}`}
    >
      <div className="flex h-11 items-center gap-1.5 rounded-xl border border-flame-200 bg-white px-2 shadow-2xs transition-colors hover:border-flame-300 focus-within:border-flame-400 focus-within:ring-2 focus-within:ring-flame-200">
        <span className="pl-1 text-xs font-semibold text-gray-500 select-none">{label}</span>

        {/* Circular Decrement Nav Arrow */}
        <button
          type="button"
          aria-label={`Decrease ${label} year`}
          onMouseDown={() => startHolding(-1)}
          onMouseUp={stopHolding}
          onMouseLeave={stopHolding}
          onTouchStart={() => startHolding(-1)}
          onTouchEnd={stopHolding}
          onTouchCancel={stopHolding}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-flame-200 bg-white text-flame-700 shadow-2xs transition-transform hover:border-flame-300 hover:bg-flame-50 active:scale-90"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Text/Number Input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label={`${label} year`}
          className="w-12 text-center font-heading text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none"
        />

        {/* Circular Increment Nav Arrow */}
        <button
          type="button"
          aria-label={`Increase ${label} year`}
          onMouseDown={() => startHolding(1)}
          onMouseUp={stopHolding}
          onMouseLeave={stopHolding}
          onTouchStart={() => startHolding(1)}
          onTouchEnd={stopHolding}
          onTouchCancel={stopHolding}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-flame-200 bg-white text-flame-700 shadow-2xs transition-transform hover:border-flame-300 hover:bg-flame-50 active:scale-90"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Quick Dropdown Picker Trigger */}
        <button
          type="button"
          aria-label={`Open ${label} year picker`}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={`flex h-7 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-flame-50 hover:text-flame-700 ${
            dropdownOpen ? 'text-flame-700' : ''
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180 text-flame-600' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Menu of Years */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-1.5 max-h-52 w-36 overflow-y-auto rounded-xl border border-flame-100 bg-white p-1 shadow-[0_12px_32px_rgba(120,84,28,0.22)] ring-1 ring-white"
          >
            {quickYears.map((yr) => {
              const yrStr = String(yr);
              const active = value === yrStr;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    onChange(yrStr);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-flame-50 font-bold text-flame-900'
                      : 'text-gray-700 hover:bg-flame-50/70 hover:text-flame-800'
                  }`}
                >
                  <span>{yr}</span>
                  {active && <Check className="h-3.5 w-3.5 text-flame-600" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Search Filter Toolbar
// ---------------------------------------------------------------------------
interface SearchFiltersProps {
  magazines: ApiMagazine[];
  magazinesLoading: boolean;
  magazineFilter: string;
  onMagazineChange: (id: string) => void;
  yearMode: 'specific' | 'range';
  onYearModeChange: (mode: 'specific' | 'range') => void;
  specificYear: string;
  onSpecificYearChange: (val: string) => void;
  yearFrom: string;
  onYearFromChange: (val: string) => void;
  yearTo: string;
  onYearToChange: (val: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalMatches?: number | null;
  loading?: boolean;
  hasSearched?: boolean;
}

export function SearchFilters({
  magazines,
  magazinesLoading,
  magazineFilter,
  onMagazineChange,
  yearMode,
  onYearModeChange,
  specificYear,
  onSpecificYearChange,
  yearFrom,
  onYearFromChange,
  yearTo,
  onYearToChange,
  onClearFilters,
  hasActiveFilters,
  totalMatches,
  loading = false,
  hasSearched = false,
}: SearchFiltersProps) {
  return (
    <div className="relative z-30 mt-4 flex flex-col gap-3 rounded-2xl border border-flame-100/90 bg-white p-2.5 sm:p-3 shadow-2xs md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
        {/* Magazine Custom Dropdown */}
        <div className="flex w-full justify-center sm:w-auto sm:justify-start">
          <SearchMagazineMenu
            magazines={magazines}
            selected={magazineFilter}
            onChange={onMagazineChange}
            loading={magazinesLoading}
          />
        </div>

        {/* Year Mode Selector: Specific year vs Year range (both with icons) */}
        <div className="flex h-11 items-center justify-center rounded-xl bg-flame-50/70 p-1 text-xs font-semibold text-gray-600 ring-1 ring-flame-100">
          <button
            type="button"
            onClick={() => onYearModeChange('specific')}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition-all ${
              yearMode === 'specific'
                ? 'bg-white text-flame-900 shadow-2xs ring-1 ring-flame-200/80 font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-flame-600" />
            <span>Specific year</span>
          </button>
          <button
            type="button"
            onClick={() => onYearModeChange('range')}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition-all ${
              yearMode === 'range'
                ? 'bg-white text-flame-900 shadow-2xs ring-1 ring-flame-200/80 font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5 text-flame-600" />
            <span>Year range</span>
          </button>
        </div>

        {/* Year Stepper Inputs */}
        {yearMode === 'specific' ? (
          <div className="flex w-full justify-center sm:w-auto sm:justify-start">
            <YearStepperInput
              label="Year"
              value={specificYear}
              onChange={onSpecificYearChange}
              placeholder={String(new Date().getFullYear())}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-2">
            <div className="relative z-30 flex w-full justify-center sm:w-auto">
              <YearStepperInput
                label="From"
                value={yearFrom}
                onChange={onYearFromChange}
                placeholder="1990"
                className="z-30"
              />
            </div>
            <span className="hidden text-xs font-bold text-gray-400 select-none sm:inline-block">—</span>
            <div className="relative z-20 flex w-full justify-center sm:w-auto">
              <YearStepperInput
                label="To"
                value={yearTo}
                onChange={onYearToChange}
                placeholder={String(new Date().getFullYear())}
                className="z-20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right side: Reset filter button and match status */}
      <div className="ml-auto flex w-full items-center justify-end gap-2.5 sm:w-auto">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-flame-50 hover:text-flame-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset filters</span>
          </button>
        )}

        {hasSearched && (
          <span
            role="status"
            className="inline-flex items-center rounded-lg bg-flame-50/80 px-2.5 py-1 text-xs font-semibold tracking-wide text-flame-800 ring-1 ring-flame-200/60"
          >
            {loading ? 'Searching…' : totalMatches !== null && totalMatches !== undefined ? `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} shown` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
