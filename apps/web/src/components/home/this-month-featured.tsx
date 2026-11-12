'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getImageProps, type StaticImageData } from 'next/image';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  RotateCcw,
} from 'lucide-react';
import type { ApiIssue, ApiMagazine, HeroPresentationTheme } from '@/lib/api';
import { HeroIssuePicker } from './hero-issue-picker';
import { issueDetailPath } from '@/lib/issue-detail-url';
import type { HeroPickerIssue } from '@/lib/hero-picker-issue';
import { HERO_PLACEMENT_DEFAULTS, resolveHeroPlacement as resolvePlacement, type HeroPlacement } from '@/lib/hero-placement';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { Language, MonthIndex } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
import { cn, formatFileSize, formatMonthYear } from '@/lib/utils';
import aimOctoberPhoneHero from './aim-oct-2026-phone.png';
const SlideReader = dynamic(() => import('./slide-reader'), { ssr: false });


interface ThisMonthFeaturedProps {
  magazines: ApiMagazine[];
  /** One server-selected live issue per magazine. */
  issues: ApiIssue[];
  archiveIssues: HeroPickerIssue[];
  onPreviewChange?: (open: boolean) => void;
}

type CoverPalette = { dominant: string; foreground: string; accents?: string[] };
const DEFAULT_COVER_PALETTE: CoverPalette = { dominant: '#0e3f63', foreground: '#f6e8c0' };
const coverPaletteCache = new Map<string, CoverPalette>();
function darkCoverColour(colour: string, maxLuminance: number): string {
  const rgb=/^rgb\((\d+)\s+(\d+)\s+(\d+)\)$/.exec(colour);
  const hex=/^#([0-9a-f]{6})$/i.exec(colour);
  const channels=rgb?[Number(rgb[1]),Number(rgb[2]),Number(rgb[3])]:hex?[0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16)):null;
  if(!channels)return DEFAULT_COVER_PALETTE.dominant;
  const luminance=(scale:number)=>{
    const linear=channels.map(channel=>{
      const value=channel*scale/255;
      return value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4;
    });
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  };
  if(luminance(1)<=maxLuminance)return `rgb(${channels.join(' ')})`;
  let low=0,high=1;
  for(let step=0;step<10;step++){
    const middle=(low+high)/2;
    if(luminance(middle)>maxLuminance)high=middle;
    else low=middle;
  }
  return `rgb(${channels.map(channel=>Math.round(channel*low)).join(' ')})`;
}
function automaticForeground(colour:string):string {
  const rgb=/^rgb\((\d+)\s+(\d+)\s+(\d+)\)$/.exec(colour);
  const hex=/^#([0-9a-f]{6})$/i.exec(colour);
  const channels=rgb?[Number(rgb[1]),Number(rgb[2]),Number(rgb[3])]:hex?[0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16)):null;
  if(!channels)return '#ffffff';
  const linear=channels.map(channel=>{const value=channel/255;return value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4;});
  const luminance=0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  return 1.05/(luminance+0.05)>=(luminance+0.05)/0.089?'#ffffff':'#17384d';
}
function colourChannels(colour:string):number[]|null {
  const rgb=/^rgb\((\d+)\s+(\d+)\s+(\d+)\)$/.exec(colour);
  const hex=/^#([0-9a-f]{6})$/i.exec(colour);
  return rgb?[Number(rgb[1]),Number(rgb[2]),Number(rgb[3])]:hex?[0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16)):null;
}
export function automaticHeroButtonColour(theme?:HeroPresentationTheme|null,fallback=DEFAULT_COVER_PALETTE.dominant,accents:string[]=[]):string {
  const sampled=theme?.sampled;
  const sampledColour=sampled?.length===3&&sampled.every(Number.isFinite)?`rgb(${sampled.map(channel=>Math.max(0,Math.min(255,Math.round(channel)))).join(' ')})`:fallback;
  const background=colourChannels(sampledColour);
  const candidates=accents.map(colour=>({colour,channels:colourChannels(colour)})).filter((candidate):candidate is {colour:string;channels:number[]}=>Boolean(candidate.channels));
  if(background&&candidates.length){
    const selected=candidates.sort((a,b)=>{
      const score=(channels:number[])=>{const max=Math.max(...channels),min=Math.min(...channels);const saturation=max?1-min/max:0;const distance=Math.hypot(...channels.map((channel,index)=>channel-background[index]))/441.7;return saturation*0.6+distance*0.7;};
      return score(b.channels)-score(a.channels);
    })[0].channels;
    return `#${selected.map(channel=>channel.toString(16).padStart(2,'0')).join('')}`;
  }
  const colour=darkCoverColour(sampledColour,0.14);
  const rgb=/^rgb\((\d+)\s+(\d+)\s+(\d+)\)$/.exec(colour);
  return rgb?`#${[rgb[1],rgb[2],rgb[3]].map(channel=>Number(channel).toString(16).padStart(2,'0')).join('')}`:colour;
}
function heroColours(palette: CoverPalette, theme?: HeroPresentationTheme | null, buttonTheme:HeroPresentationTheme|null|undefined=theme, phoneOnWhite=false) {
  const dominant=palette.dominant;
  const savedTheme=theme as (HeroPresentationTheme & {preference?:string;accentOverride?:string|null}) | null | undefined;
  const savedButtonTheme=buttonTheme as (HeroPresentationTheme & {accentOverride?:string|null}) | null | undefined;
  const hasSavedColours=Boolean(savedTheme?.textTone||savedTheme?.preference||savedTheme?.text);
  const heading=darkCoverColour(dominant,0.14);
  const body=darkCoverColour(dominant,0.16);
  const automaticContent=automaticHeroButtonColour(theme,dominant);
  const useAutomaticPhoneText=phoneOnWhite&&(!savedTheme?.textTone||savedTheme.textTone==='auto');
  const automaticButton=automaticHeroButtonColour(buttonTheme,dominant,palette.accents);
  const buttonOverride=savedButtonTheme?.buttonBackgroundOverride??savedButtonTheme?.accentOverride;
  const button=buttonOverride??automaticButton;
  const buttonForeground=savedButtonTheme?.buttonTextTone==='dark'?'#17384d':savedButtonTheme?.buttonTextTone==='light'?'#ffffff':automaticForeground(button);
  return {
    heading:useAutomaticPhoneText?automaticContent:hasSavedColours?theme?.text??heading:heading,
    body:useAutomaticPhoneText?automaticContent:hasSavedColours?theme?.mutedText??body:body,
    button,
    buttonForeground,
  };
}
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

function ScenicBackground({ src, media, sizes, className, onReady }: {
  src: string | StaticImageData;
  media: string;
  sizes: string;
  className?: string;
  onReady: () => void;
}) {
  const { props } = getImageProps({
    src,
    alt: '',
    fill: true,
    sizes,
    unoptimized: typeof src === 'string' && src.startsWith('/api/admin/'),
  });
  return (
    <picture>
      <source media={media} srcSet={props.srcSet ?? props.src} sizes={props.sizes} />
      {/* The unmatched viewport receives a transparent pixel; only the matching source downloads. */}
      <img src={TRANSPARENT_PIXEL} alt="" style={props.style} className={className} fetchPriority="high" onLoad={(event) => {
        if (event.currentTarget.currentSrc !== TRANSPARENT_PIXEL) onReady();
      }} />
    </picture>
  );
}

function useCoverPalette(coverUrl: string | null, coverLoaded: boolean): CoverPalette {
  const [palette, setPalette] = useState(() => coverUrl ? coverPaletteCache.get(coverUrl) ?? DEFAULT_COVER_PALETTE : DEFAULT_COVER_PALETTE);

  useEffect(() => {
    if (!coverUrl) {
      setPalette(DEFAULT_COVER_PALETTE);
      return;
    }

    const cached = coverPaletteCache.get(coverUrl);
    if (cached) { setPalette(cached); return; }
    if (!coverLoaded) return;
    let cancelled = false;
    const separator = coverUrl.includes('?') ? '&' : '?';
    fetch(`${coverUrl}${separator}palette=2`)
      .then((response) => response.ok ? response.json() as Promise<CoverPalette | null> : null)
      .then((nextPalette) => {
        if (!nextPalette || cancelled) return;
        coverPaletteCache.set(coverUrl, nextPalette);
        setPalette(nextPalette);
      })
      .catch(() => { if (!cancelled) setPalette(DEFAULT_COVER_PALETTE); });
    return () => { cancelled = true; };
  }, [coverUrl, coverLoaded]);

  return palette;
}

type MagazineFilter = 'all' | string;
const EMPTY_ISSUES: ApiIssue[] = [];

/**
 * Homepage issue feature. Shows one readable issue at a time with magazine
 * filters and date-ordered navigation.
 *
 * No auto-rotation. Issues change through the control bar, keyboard arrows,
 * or horizontal swipes on the hero. Swipes in the embedded reader turn pages.
 */
export function ThisMonthFeatured({
  magazines,
  issues,
  archiveIssues,
  onPreviewChange,
}: ThisMonthFeaturedProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{x:number;y:number;identifier:number}|null>(null);
  const pendingSelectionRef = useRef<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const heroReadyIds = useMemo(() => new Set(issues.filter((issue) => (
    issue.hero?.mobileUrl && issue.hero.desktopUrl.startsWith('/api/hero-assets/')
  ) || (
    issue.hero?.desktopUrl === '/aim-oct-2026-hero.png' &&
    issue.year === 2026 && issue.month === 10 &&
    issue.magazines.name.toLowerCase().includes('all india')
  )).map((issue) => issue.id)), [issues]);

  // ---------- Filter state ----------
  const [magazineFilter, setMagazineFilter] = useState<MagazineFilter>(() =>
    magazines.find((magazine) =>
      magazine.name.toLowerCase().includes('all india') &&
      issues.some((issue) => issue.magazine_id === magazine.id),
    )?.id ?? 'all',
  );
  const [showPrevious, setShowPrevious] = useState(false);

  // Pre-bucket the source issues by month — stable references keep the
  // downstream memos cheap on re-render.
  const currentMonthIssues = issues;
  const prevMonthIssues = EMPTY_ISSUES;

  // The set of issues feeding the current view, before the magazine filter is
  // applied. Used both to compute `visibleIssues` and to disable magazine
  // chips that have no representation in the current month set.
  const monthSet = useMemo(
    () =>
      showPrevious
        ? [...currentMonthIssues, ...prevMonthIssues]
        : currentMonthIssues,
    [showPrevious, currentMonthIssues, prevMonthIssues],
  );

  const visibleIssues = useMemo(
    () =>
      monthSet.filter((i) =>
        magazineFilter === 'all' ? true : i.magazine_id === magazineFilter,
      ).sort((a, b) => a.year - b.year || a.month - b.month || a.title.localeCompare(b.title)),
    [monthSet, magazineFilter],
  );

  /** Magazines that have at least one issue in the current view (regardless
   *  of the magazine filter). Drives the disabled state of magazine chips. */
  const magazinesInView = useMemo(
    () => new Set(monthSet.map((i) => i.magazine_id)),
    [monthSet],
  );

  // If the toggle change leaves the active magazine filter pointing at a
  // magazine with no issues in the new view, fall back to "All". Prevents
  // a "stuck on disabled chip" empty state.
  useEffect(() => {
    if (magazineFilter !== 'all' && !magazinesInView.has(magazineFilter)) {
      setMagazineFilter('all');
    }
  }, [magazineFilter, magazinesInView]);

  // ---------- Slideshow state ----------
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, visibleIssues.length - 1));
  const [slideDirection, setSlideDirection] = useState<-1|0|1>(0);
  const [heroHasEntered, setHeroHasEntered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onPreviewChange?.(previewOpen);
  }, [onPreviewChange, previewOpen]);

  // Start each filtered set at its newest issue.
  useEffect(() => {
    setPreviewOpen(false);
    setSlideDirection(0);
    const requested = pendingSelectionRef.current;
    const requestedIndex = requested ? visibleIssues.findIndex((issue) => issue.id === requested) : -1;
    if (requestedIndex >= 0) pendingSelectionRef.current = null;
    setCurrentIndex(requestedIndex >= 0 ? requestedIndex : Math.max(0, visibleIssues.length - 1));
  }, [magazineFilter, showPrevious, visibleIssues]);

  // Defensive clamp — if the visible set shrinks to fewer items than the
  // current index, snap back to start.
  useEffect(() => {
    if (currentIndex >= visibleIssues.length) setCurrentIndex(Math.max(0, visibleIssues.length - 1));
  }, [visibleIssues.length, currentIndex]);

  function goPrev() {
    if (previewOpen) return;
    if (currentIndex <= 0) return;
    setSlideDirection(-1);
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }
  function goNext() {
    if (previewOpen) return;
    if (currentIndex >= visibleIssues.length - 1) return;
    setSlideDirection(1);
    setCurrentIndex((idx) => Math.min(visibleIssues.length - 1, idx + 1));
  }
  function jumpTo(idx: number) {
    if (previewOpen) return;
    if (idx === currentIndex) return;
    setSlideDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  }

  function selectPickerIssue(issue: HeroPickerIssue) {
    closePicker();
    if (heroReadyIds.has(issue.id)) {
      const visibleIndex = visibleIssues.findIndex((candidate) => candidate.id === issue.id);
      if (visibleIndex >= 0) jumpTo(visibleIndex);
      else {
        pendingSelectionRef.current = issue.id;
        setMagazineFilter(issue.magazine_id);
      }
      requestAnimationFrame(() => containerRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' }));
      return;
    }
    if (issue.readable) {
      rememberReaderSource(issue.id, 'shelf');
      router.push(readerPath(issue.id));
    } else {
      router.push(issueDetailPath(issue.id));
    }
  }

  function onHeroTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const target=event.target;
    if(previewOpen||visibleIssues.length<=1||event.touches.length!==1||!(target instanceof Element)||!target.closest('[data-hero-swipe]')||target.closest('button,a,input,select,textarea,[role="button"]')){
      swipeStartRef.current=null;
      return;
    }
    const touch=event.touches[0];
    swipeStartRef.current={x:touch.clientX,y:touch.clientY,identifier:touch.identifier};
  }

  function onHeroTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start=swipeStartRef.current;
    swipeStartRef.current=null;
    if(!start)return;
    const touch=Array.from(event.changedTouches).find(item=>item.identifier===start.identifier);
    if(!touch)return;
    const deltaX=touch.clientX-start.x;
    const deltaY=touch.clientY-start.y;
    if(Math.abs(deltaX)<60||Math.abs(deltaX)<Math.abs(deltaY)*1.5)return;
    if(deltaX<0)goNext();
    else goPrev();
  }

  // Keyboard navigation — only when focus is inside the carousel section.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (previewOpen) return;
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideDirection(-1);
        setCurrentIndex((index) => Math.max(0, index - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSlideDirection(1);
        setCurrentIndex((index) => Math.min(visibleIssues.length - 1, index + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewOpen, visibleIssues.length]);

  // Preload neighbour issues' cover JPEGs and PDFs into the browser cache so
  // slide changes don't flash white. Cover JPEGs are ~100 KB and warm
  // Next/Image's cache; the PDF fetch primes HTTP cache so react-pdf hits the
  // cache when it remounts on the next slide. Skipped on slow / save-data
  // connections.
  useEffect(() => {
    if (visibleIssues.length <= 1) return;
    const nextIdx = (currentIndex + 1) % visibleIssues.length;
    const prevIdx =
      (currentIndex - 1 + visibleIssues.length) % visibleIssues.length;
    const neighbours = [visibleIssues[nextIdx], visibleIssues[prevIdx]].filter(
      (issue, i, arr) => arr.findIndex((j) => j.id === issue.id) === i,
    );
    for (const issue of neighbours) {
      if (issue.cover_image_url) {
        const img = new window.Image();
        img.src = issue.cover_image_url;
      }
    }
  }, [currentIndex, visibleIssues]);

  // Give the page a useful first action when the catalogue has no readable issue.
  if (currentMonthIssues.length === 0 && prevMonthIssues.length === 0)
    return (
      <section className="mx-auto w-full max-w-[1440px] px-2 py-16 text-center sm:py-24">
        <h1 className="font-heading text-3xl leading-tight text-gray-900 sm:text-5xl">Explore the public archive</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-700">Readable editions will appear here as the archive grows.</p>
        <Link href="/browse" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-flame-600 px-5 py-2.5 font-semibold text-white hover:bg-flame-700">Browse archive</Link>
      </section>
    );

  const safeIndex =
    visibleIssues.length > 0
      ? Math.min(currentIndex, visibleIssues.length - 1)
      : 0;
  const currentIssue = visibleIssues[safeIndex];


  const showMagazineFilter = magazines.length > 1;
  const hasPrevContent = prevMonthIssues.length > 0;

  return (
    <section
      className="relative -mx-4 -mt-5 w-[calc(100%+2rem)] max-w-none sm:-mx-6 sm:-mt-9 sm:w-[calc(100%+3rem)] lg:mx-auto lg:mt-0 lg:w-full"
      aria-label="Featured issues"
    >


      {/* Slideshow + control bar */}
      <div
        ref={containerRef}
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured editions"
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {currentIssue
            ? `Showing edition ${safeIndex + 1} of ${visibleIssues.length}: ${currentIssue.title}`
            : ''}
        </div>

        {visibleIssues.length === 0 ? (
          <EmptyState
            magazineFilterActive={magazineFilter !== 'all'}
            showPrevious={showPrevious}
            hasPrevContent={hasPrevContent}
            onClearMagazine={() => setMagazineFilter('all')}
            onShowPrevious={() => setShowPrevious(true)}
          />
        ) : (
          <>
            <div
              className="relative overflow-hidden"
              aria-roledescription="slide"
              aria-label={`${safeIndex + 1} of ${visibleIssues.length}`}
            >
              <AnimatePresence initial={false} mode="popLayout" custom={slideDirection}>
                <motion.div
                  key={currentIssue!.id}
                  custom={slideDirection}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  variants={{
                    enter:(direction:number)=>({x:reduceMotion||direction===0?'0%':`${direction*100}%`}),
                    center:{x:'0%'},
                    exit:(direction:number)=>({x:reduceMotion||direction===0?'0%':`${direction*-100}%`}),
                  }}
                  transition={{duration:reduceMotion?0.01:0.55,ease:[0.16,1,0.3,1]}}
                  className="touch-pan-y"
                  onTouchStart={onHeroTouchStart}
                  onTouchEnd={onHeroTouchEnd}
                  onTouchCancel={()=>{swipeStartRef.current=null;}}
                >
                  <FeaturedSlide issue={currentIssue!} animateEntrance={!heroHasEntered} onHeroReady={() => setHeroHasEntered(true)} onPreviewChange={setPreviewOpen} />
                </motion.div>
              </AnimatePresence>
              {!previewOpen && <><button type="button" onClick={goPrev} disabled={currentIndex<=0} aria-label="Show previous featured issue" className="group/left-edge absolute inset-y-0 left-0 z-20 hidden w-[11%] items-center justify-start pl-3 text-flame-600 md:flex lg:pl-5 disabled:cursor-not-allowed disabled:text-flame-300">
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-flame-500/20 via-flame-300/8 to-transparent opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/left-edge:opacity-100 group-focus-visible/left-edge:opacity-100"/>
                <ChevronLeft className="relative h-20 w-12 -translate-x-3 scale-y-150 opacity-0 drop-shadow-[0_2px_2px_rgba(255,255,255,0.95)] transition-[opacity,transform,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/left-edge:translate-x-0 group-hover/left-edge:opacity-100 group-focus-visible/left-edge:translate-x-0 group-focus-visible/left-edge:opacity-100" strokeWidth={1.25}/>
              </button>
              <button type="button" onClick={goNext} disabled={currentIndex>=visibleIssues.length-1} aria-label="Show next featured issue" className="group/right-edge absolute inset-y-0 right-0 z-20 hidden w-[11%] items-center justify-end pr-3 text-flame-600 md:flex lg:pr-5 disabled:cursor-not-allowed disabled:text-flame-300">
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-l from-flame-500/20 via-flame-300/8 to-transparent opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/right-edge:opacity-100 group-focus-visible/right-edge:opacity-100"/>
                <ChevronRight className="relative h-20 w-12 translate-x-3 scale-y-150 opacity-0 drop-shadow-[0_2px_2px_rgba(255,255,255,0.95)] transition-[opacity,transform,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/right-edge:translate-x-0 group-hover/right-edge:opacity-100 group-focus-visible/right-edge:translate-x-0 group-focus-visible/right-edge:opacity-100" strokeWidth={1.25}/>
              </button>
              </>}
            </div>

            {!previewOpen && <CarouselControls
              issues={visibleIssues}
              currentIndex={safeIndex}
              goPrev={goPrev}
              goNext={goNext}
              jumpTo={jumpTo}
              openPicker={() => setPickerOpen(true)}
            />}
          </>
        )}
      </div>
      {/* Toolbar — magazine chips + previous-month toggle. Hidden when there's
          nothing meaningful to filter. */}
      {(showMagazineFilter || hasPrevContent) && (
        <div
          className="mt-5 flex flex-col items-center gap-3 px-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3 sm:px-0"
          role="toolbar"
          aria-label="Filter editions"
        >
          {showMagazineFilter && (
            <MagazineFilterStrip
              magazines={magazines}
              value={magazineFilter}
              available={magazinesInView}
              onChange={setMagazineFilter}
            />
          )}
          {hasPrevContent && (
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
              <PreviousMonthToggle
                active={showPrevious}
                onToggle={() => setShowPrevious((v) => !v)}
              />
              {/* When the toggle is on, gently point users at /browse for
                  anything older than the previous month — the homepage
                  carousel intentionally caps at two months. */}
              <AnimatePresence initial={false}>
                {showPrevious && <BrowseOlderHint />}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
      <HeroIssuePicker open={pickerOpen} initialYear={currentIssue?.year ?? new Date().getFullYear()} issues={archiveIssues} heroReadyIds={heroReadyIds} onClose={closePicker} onSelect={selectPickerIssue} />
    </section>
  );
}

// ---------- Magazine filter strip ----------
function MagazineFilterStrip({
  magazines,
  value,
  available,
  onChange,
}: {
  magazines: ApiMagazine[];
  value: MagazineFilter;
  /** Magazines that have ≥1 issue in the currently-visible month set. */
  available: Set<string>;
  onChange: (next: MagazineFilter) => void;
}) {
  const options: {
    value: MagazineFilter;
    label: string;
    disabled?: boolean;
  }[] = [
    ...[...magazines].sort((a, b) => {
      const rank = (name: string) => name.toLowerCase().includes('all india') ? 0 : name.toLowerCase().includes('agnishikha') ? 1 : 2;
      return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
    }).map((m) => ({
      value: m.id,
      label: m.name,
      disabled: !available.has(m.id),
    })),
    { value: 'all', label: 'All' },
  ];
  return (
    <div className="flex w-full min-w-0 justify-center sm:w-auto">
      <div className="flex w-full min-w-0 flex-wrap justify-center gap-1.5 sm:w-auto sm:flex-nowrap">
        {options.map((opt) => {
          const active = opt.value === value;
          const disabled = !!opt.disabled;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              title={disabled ? 'No editions in the current view' : undefined}
              className={cn(
                'min-h-11 flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_4px_14px_rgba(190,140,46,0.22)]'
                  : disabled
                    ? 'border border-gray-100 bg-gray-50 text-gray-300 line-through decoration-gray-200'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Previous-month toggle ----------
function PreviousMonthToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 py-2 text-[clamp(10px,2.9vw,12px)] font-semibold transition-all sm:w-auto sm:px-4 sm:text-xs',
        active
          ? 'border border-flame-300 bg-flame-50 text-flame-700 shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
          active ? 'bg-gradient-to-r from-gold-500 to-flame-500' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full bg-white shadow transition-transform',
            active ? 'translate-x-2.5' : 'translate-x-0',
          )}
        />
      </span>
      {active
        ? "Hide Previous Month's Editions"
        : "Show Previous Month's Editions"}
    </button>
  );
}

/** Notification-style hint that appears beside the toggle when the user has
 *  expanded to two months — guiding them to /browse for anything older. The
 *  homepage carousel intentionally caps at the current + previous month. */
function BrowseOlderHint() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href="/browse"
        className="group inline-flex items-center gap-2 rounded-full border border-flame-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
      >
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-flame-500" />
        </span>
        <span>For older editions, browse the archive</span>
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

// ---------- Single unified control bar (below the slide) ----------
function CarouselControls({
  issues,
  currentIndex,
  goPrev,
  goNext,
  jumpTo,
  openPicker,
}: {
  issues: ApiIssue[];
  currentIndex: number;
  goPrev: () => void;
  goNext: () => void;
  jumpTo: (i: number) => void;
  openPicker: () => void;
}) {
  if (issues.length === 0) return null;
  const recentIndex = issues.length - 1;
  const showingOlderIssue = currentIndex < recentIndex;
  const selectedIssue = issues[currentIndex];
  return (
    <div className="mt-6 px-4 sm:px-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="col-start-2 flex items-center justify-center gap-2 sm:gap-4">
      <button
        type="button"
        onClick={goPrev}
        disabled={currentIndex === 0}
        aria-label="Older edition"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-colors hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={openPicker}
        aria-label={`Choose an archive issue, starting with ${formatMonthYear(selectedIssue.month, selectedIssue.year)}`}
        className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full border border-flame-200 bg-white px-3 text-sm font-semibold text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 sm:min-w-40 sm:px-4"
      >
        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={selectedIssue.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.16 }}
          >
            {formatMonthYear(selectedIssue.month, selectedIssue.year)}
          </motion.span>
        </AnimatePresence>
      </button>

      <button
        type="button"
        onClick={goNext}
        disabled={currentIndex === recentIndex}
        aria-label="Newer edition"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-colors hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>
      </div>

      {showingOlderIssue && (
        <button
          type="button"
          onClick={() => jumpTo(recentIndex)}
          aria-label="Jump to most recent issue"
          title="Most recent issue"
          className="col-span-3 mt-1 flex h-10 w-10 items-center justify-center justify-self-center rounded-full border border-flame-200 bg-white text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 sm:col-span-1 sm:col-start-3 sm:ml-2 sm:mt-0 sm:justify-self-start"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      </div>
    </div>
  );
}

// ---------- Empty state ----------
function EmptyState({
  magazineFilterActive,
  showPrevious,
  hasPrevContent,
  onClearMagazine,
  onShowPrevious,
}: {
  magazineFilterActive: boolean;
  showPrevious: boolean;
  hasPrevContent: boolean;
  onClearMagazine: () => void;
  onShowPrevious: () => void;
}) {
  if (magazineFilterActive) {
    return (
      <EmptyCard
        title="No editions for this magazine in the current view."
        ctaLabel="Show all magazines"
        onCta={onClearMagazine}
      />
    );
  }
  if (!showPrevious && hasPrevContent) {
    return (
      <EmptyCard
        title="Nothing newly released this month."
        subtitle="Previous month's releases are still available."
        ctaLabel="Show Previous Month's Editions"
        onCta={onShowPrevious}
      />
    );
  }
  return (
    <EmptyCard title="No editions newly released in this window yet — check back next month." />
  );
}

function EmptyCard({
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mx-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-flame-200 bg-gradient-to-br from-gold-50/40 to-flame-50/40 px-6 py-16 text-center sm:mx-0">
      <p className="font-heading text-lg text-gray-600">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-4 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ---------- Single slide (rich, focused — with embedded reader) ----------
function FeaturedSlide({ issue, animateEntrance, onHeroReady, onPreviewChange }: { issue: ApiIssue; animateEntrance: boolean; onHeroReady: () => void; onPreviewChange: (open: boolean) => void }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { toggle, isBookmarked } = useBookmarks();
  const [previewOpen, setPreviewOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarked = isBookmarked(issue.id);
  const [coverLoaded,setCoverLoaded]=useState(false);
  const onCoverLoad=useCallback(()=>setCoverLoaded(true),[]);
  const coverPalette = useCoverPalette(issue.cover_image_url,coverLoaded);

  function changePreview(open: boolean) {
    if (open && !issue.pdf_url) return;
    setPreviewOpen(open);
    onPreviewChange(open);
  }

  useEffect(() => {
    if (!previewOpen) return;
    articleRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [previewOpen, reduceMotion]);

  function openBook() {
    if (!issue.pdf_url) return;
    rememberReaderSource(issue.id,'shelf');
    router.push(readerPath(issue.id));
  }

  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const language = (issue.magazines.language as Language) ?? 'english';
  const eyebrow = `${issue.magazines.name} — ${monthName} ${issue.year}`;
  const sortedTopics = [...issue.topics]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 3);

  // Embargoed issues never reach the carousel (server fetch filters them),
  // but if a `pdf_url` ever lands null here we'd hand react-pdf a broken
  // input — so the carousel just won't render the slide.
  return (
    <article ref={articleRef} className="scroll-mt-[104px] overflow-hidden bg-[#fffdf9] sm:scroll-mt-[112px]">
      <div
        aria-hidden={previewOpen || undefined}
        inert={previewOpen || undefined}
        className={previewOpen ? 'hidden' : undefined}
      >
        <MobileScenicHero
          issue={issue}
          eyebrow={eyebrow}
          monthName={monthName}
          bookmarked={bookmarked}
          onBookmark={() => toggle(issue.id)}
          onPreview={() => changePreview(true)}
          onBookOpen={openBook}
          animateEntrance={animateEntrance}
          backgroundSrc={issue.hero?.mobileUrl ?? undefined}
          theme={issue.hero?.mobileTheme ?? issue.hero?.desktopTheme}
          buttonTheme={issue.hero?.desktopTheme}
          coverPalette={coverPalette}
          onCoverLoad={onCoverLoad}
          onReady={() => {
            onHeroReady();
          }}
        />
        <DesktopScenicHero
          issue={issue}
          eyebrow={eyebrow}
          monthName={monthName}
          sortedTopics={sortedTopics}
          bookmarked={bookmarked}
          onBookmark={() => toggle(issue.id)}
          onPreview={() => changePreview(true)}
          onBookOpen={openBook}
          animateEntrance={animateEntrance}
          backgroundSrc={issue.hero?.desktopUrl}
          theme={issue.hero?.desktopTheme}
          coverPalette={coverPalette}
          onCoverLoad={onCoverLoad}
          onReady={() => {
            onHeroReady();
          }}
        />
      </div>
      <AnimatePresence initial={false}>
      {previewOpen ? <motion.div key="preview" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: 0.24 }} onAnimationComplete={() => { if (previewOpen) backButtonRef.current?.focus({ preventScroll: true }); }}>
        <div className="pointer-events-none sticky top-0 z-30 h-0">
          <div className="pointer-events-auto absolute left-3 top-3 flex w-[calc(100vw-1.5rem)] items-center gap-2 sm:left-8 sm:top-4 sm:w-auto sm:gap-3">
            <button ref={backButtonRef} type="button" onClick={() => changePreview(false)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-[0_4px_12px_rgba(83,58,22,0.09)] transition-colors hover:border-gold-300 hover:bg-gold-50 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={() => changePreview(false)} aria-label={`Show details for ${issue.title}`} className="inline-flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-gold-200 bg-white px-2.5 py-2 text-left shadow-[0_4px_12px_rgba(83,58,22,0.09)] transition-colors hover:border-gold-300 hover:bg-gold-50 sm:max-w-xs sm:flex-none">
              <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md bg-gold-50">
                {issue.cover_image_url ? <Image src={issue.cover_image_url} alt="" fill sizes="32px" className="object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-gray-900">{issue.magazines.name}</strong>
                <span className="block text-xs text-gray-600">{monthName} {issue.year}</span>
              </span>
            </button>
          </div>
        </div>
        <div id={`preview-${issue.id}`}>
          <SlideReader issueId={issue.id} pdfUrl={issue.pdf_url!} fallbackCoverUrl={issue.cover_image_url} fallbackTitle={issue.title} magazineName={issue.magazines.name} monthName={monthName} year={issue.year} language={language} />
        </div>
      </motion.div> : null}
      </AnimatePresence>
    </article>
  );
}

function ScenicBookCover({issue,sizes,phone=false,onCoverLoad}:{issue:ApiIssue;sizes:string;phone?:boolean;onCoverLoad:()=>void}) {
  const [loaded,setLoaded]=useState(false);
  const [failed,setFailed]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const coverRef=useRef<HTMLSpanElement>(null);
  const reduceMotion=useReducedMotion();
  useEffect(()=>{
    const image=coverRef.current?.querySelector('img');
    if(image?.complete&&image.naturalWidth>0){setLoaded(true);onCoverLoad();}
    else if(image?.complete){setFailed(true);}
    else setHydrated(true);
  },[onCoverLoad]);
  const waiting=hydrated&&!loaded;
  return <span ref={coverRef} className="scenic-book-cover">
    {issue.cover_image_url&&!failed?<>
      <Image src={issue.cover_image_url} alt={issue.title} fill priority sizes={sizes} className={cn('object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none',waiting?'opacity-0':'opacity-100')} onLoad={()=>{setLoaded(true);onCoverLoad();}} onError={()=>setFailed(true)}/>
      <AnimatePresence initial={false}>{waiting&&<motion.span aria-hidden="true" className="archive-skeleton-wave absolute inset-0 z-[2] bg-[#eadcc1]" exit={{opacity:0}} transition={{duration:reduceMotion?0:0.3}}/>}</AnimatePresence>
    </>:<span className={phone?'flex h-full items-center justify-center bg-white/90 p-5 text-center font-heading text-lg':'flex h-full items-center justify-center bg-[#f7efe0] px-6 text-center font-heading text-xl text-[#163e61]'}>{issue.title}</span>}
    <span className="scenic-book-sheen" aria-hidden="true" />
  </span>;
}

function HeroDescriptionSummary({
  description,
  color,
  issueId,
  mobile = false,
}: {
  description: string;
  color: string;
  issueId: string;
  mobile?: boolean;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return;
    const measure = () => setTruncated(text.scrollHeight > text.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [description, mobile]);

  return (
    <div className={mobile ? 'mt-3' : 'mt-5 max-w-[59ch]'}>
      <p
        ref={textRef}
        className={cn(
          'transition-colors duration-300',
          mobile ? 'text-sm leading-6' : 'text-[clamp(0.95rem,1.15vw,1.15rem)] leading-[1.75]',
          mobile ? 'line-clamp-2' : 'line-clamp-3',
        )}
        style={{ color }}
      >
        {description}
      </p>
      {truncated ? (
        <Link
          href={issueDetailPath(issueId)}
          className="mt-1.5 inline-block rounded-md px-1 py-1 text-xs font-semibold underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color }}
        >
          View more
        </Link>
      ) : null}
    </div>
  );
}

function MobileScenicHero({ issue, eyebrow, monthName, bookmarked, onBookmark, onPreview, onBookOpen, animateEntrance, onReady, backgroundSrc, theme, buttonTheme, coverPalette, onCoverLoad }: {
  issue: ApiIssue; eyebrow: string; monthName: string; bookmarked: boolean; onBookmark: () => void; onPreview: () => void; onBookOpen:()=>void; animateEntrance: boolean; onReady: () => void; backgroundSrc?: string; theme?:HeroSceneTheme|null; buttonTheme?:HeroSceneTheme|null; coverPalette: CoverPalette; onCoverLoad:()=>void;
}) {
  const animateOnMount=useRef(animateEntrance).current;
  const [sceneReady,setSceneReady]=useState(!animateEntrance);
  const [previewPlacement,setPreviewPlacement]=useState<HeroPlacement|null>(null);
  useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.origin!==window.location.origin||event.data?.type!=='hero-placement-preview'||event.data.device!=='phone')return;setPreviewPlacement(event.data.placement??null);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  const placement=previewPlacement??resolveHeroPlacement(theme??undefined,'phone');
  const issueColours=heroColours(coverPalette,theme,buttonTheme,true);
  const sceneVariables={
    '--hero-focal-x-phone':`${placement.focalX}%`,'--hero-focal-y-phone':`${placement.focalY}%`,
    '--hero-focal-x-phone-negative':`${-placement.focalX}%`,'--hero-focal-y-phone-negative':`${-placement.focalY}%`,
  } as React.CSSProperties;
  return <div data-hero-swipe className="bg-white md:hidden">
    <div style={sceneVariables} className="scenic-phone-scene relative h-[720px] overflow-hidden">
      <div className={cn('scenic-artboard scenic-artboard-phone',animateOnMount&&sceneReady&&'scenic-artboard-enter')}>
        <ScenicBackground src={backgroundSrc ?? aimOctoberPhoneHero} media="(max-width: 767px)" sizes="100vw" className="object-cover" onReady={()=>{setSceneReady(true);onReady();}} />
        <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-transparent via-white/65 to-white" aria-hidden="true" />
        <button type="button" onClick={onBookOpen} disabled={!issue.pdf_url} aria-label={issue.pdf_url?`Read ${issue.title}`:`${issue.title} is not yet readable`} style={{left:`${placement.bookX}%`,bottom:`${100-placement.baselineY}%`,width:`${52*placement.bookScale/100}%`,transform:'translateX(-50%)'}} className="scenic-book-stage absolute z-[3] aspect-[2/3] disabled:cursor-not-allowed">
          <span className="scenic-book-shadow" aria-hidden="true" />
          <span className="scenic-book block h-full w-full" style={{ '--book-spine-color': coverPalette.dominant, '--book-spine-foreground': coverPalette.foreground } as React.CSSProperties}>
            <span className="scenic-book-pages" aria-hidden="true" />
            <span className="scenic-book-spine" aria-hidden="true">
              <span className="scenic-book-spine-title">{issue.magazines.name}</span>
              <span className="scenic-book-spine-date">{monthName} {issue.year}</span>
              <span className="scenic-book-spine-publisher">Sri Aurobindo Society</span>
            </span>
            <ScenicBookCover issue={issue} sizes="270px" phone onCoverLoad={onCoverLoad}/>
          </span>
        </button>
      </div>
    </div>
    <div className="bg-white px-7 py-6">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] transition-colors duration-300" style={{color:issueColours.body}}>{eyebrow}</p>
      <h1 className="mt-2 font-heading text-[clamp(1.9rem,9vw,3rem)] leading-none transition-colors duration-300" style={{color:issueColours.heading}}>{issue.theme || issue.title}</h1>
      {issue.description ? <HeroDescriptionSummary description={issue.description} color={issueColours.body} issueId={issue.id} mobile /> : null}
      <div className="mt-4 flex gap-2">
        {issue.pdf_url?<Link href={readerPath(issue.id)} onClick={() => rememberReaderSource(issue.id,'shelf')} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors duration-300" style={{background:issueColours.button,color:issueColours.buttonForeground}}><BookOpen className="h-4 w-4"/>Read issue</Link>:<span className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors duration-300" style={{background:issueColours.button,color:issueColours.buttonForeground}}><BookOpen className="h-4 w-4"/>Embargoed</span>}
        <button type="button" onClick={onPreview} disabled={!issue.pdf_url} aria-label="Preview pages" className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white/80 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50" style={{color:issueColours.heading,borderColor:issueColours.body}}><FileText className="h-5 w-5"/></button>
        <button type="button" onClick={onBookmark} aria-label={bookmarked?'Remove bookmark':'Save to bookmarks'} className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white/80 transition-colors duration-300" style={{color:issueColours.heading,borderColor:issueColours.body}}><Heart className={cn('h-5 w-5',bookmarked&&'fill-[#d97735] text-[#d97735]')}/></button>
      </div>
    </div>
  </div>;
}

export type HeroSceneTheme = HeroPresentationTheme;

export function resolveHeroPlacement(theme:HeroSceneTheme|undefined,device:keyof typeof HERO_PLACEMENT_DEFAULTS):HeroPlacement {
  return resolvePlacement(theme?.layout,device);
}

export function DesktopScenicHero({
  issue,
  eyebrow,
  monthName,
  sortedTopics,
  bookmarked,
  onBookmark,
  onPreview,
  onBookOpen,
  animateEntrance,
  onReady,
  backgroundSrc = '/aim-oct-2026-hero.png',
  theme = {},
  compact = false,
  coverPalette = DEFAULT_COVER_PALETTE,
  onCoverLoad = () => {},
}: {
  issue: ApiIssue;
  eyebrow: string;
  monthName: string;
  sortedTopics: string[];
  bookmarked: boolean;
  onBookmark: () => void;
  onPreview: () => void;
  onBookOpen:()=>void;
  animateEntrance: boolean;
  onReady: () => void;
  backgroundSrc?: string;
  theme?: HeroSceneTheme;
  compact?: boolean;
  coverPalette?: CoverPalette;
  onCoverLoad?:()=>void;
}) {
  const bookRef = useRef<HTMLButtonElement>(null);
  const animateOnMount=useRef(animateEntrance).current;
  const [backgroundReady, setBackgroundReady] = useState(!animateEntrance);
  const [previewPlacements,setPreviewPlacements]=useState<Partial<Record<'desktop'|'tablet',HeroPlacement>>>({});
  useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.origin!==window.location.origin||event.data?.type!=='hero-placement-preview'||!['desktop','tablet'].includes(event.data.device))return;setPreviewPlacements(current=>({...current,[event.data.device]:event.data.placement??undefined}));};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  const desktopPlacement=previewPlacements.desktop??resolveHeroPlacement(theme,'desktop');
  const tabletPlacement=previewPlacements.tablet??resolveHeroPlacement(theme,'tablet');
  const issueColours=heroColours(coverPalette,theme);
  const sceneVariables={
    '--hero-focal-x-desktop':`${desktopPlacement.focalX}%`,'--hero-focal-y-desktop':`${desktopPlacement.focalY}%`,
    '--hero-focal-x-desktop-negative':`${-desktopPlacement.focalX}%`,'--hero-focal-y-desktop-negative':`${-desktopPlacement.focalY}%`,
    '--hero-focal-x-tablet':`${tabletPlacement.focalX}%`,'--hero-focal-y-tablet':`${tabletPlacement.focalY}%`,
    '--hero-focal-x-tablet-negative':`${-tabletPlacement.focalX}%`,'--hero-focal-y-tablet-negative':`${-tabletPlacement.focalY}%`,
    '--book-x-desktop':`${desktopPlacement.bookX}%`,'--book-baseline-desktop':`${desktopPlacement.baselineY}%`,'--book-scale-desktop':desktopPlacement.bookScale/100,
    '--book-x-tablet':`${tabletPlacement.bookX}%`,'--book-baseline-tablet':`${tabletPlacement.baselineY}%`,'--book-scale-tablet':tabletPlacement.bookScale/100,
  } as React.CSSProperties;

  function moveBook(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    bookRef.current?.style.setProperty('--book-rotate-y', `${-7 + x * 14}deg`);
    bookRef.current?.style.setProperty('--book-rotate-x', `${2 - y * 8}deg`);
  }

  function resetBook() {
    bookRef.current?.style.removeProperty('--book-rotate-y');
    bookRef.current?.style.removeProperty('--book-rotate-x');
  }

  return (
    <div data-hero-swipe style={sceneVariables} className={cn('scenic-hero relative hidden overflow-hidden md:block', compact ? 'min-h-[480px]' : 'min-h-[max(720px,56.28vw)]')}>
      <div className={cn('scenic-artboard scenic-artboard-landscape',animateOnMount&&backgroundReady&&'scenic-artboard-enter')}>
        <ScenicBackground
          src={backgroundSrc}
          media="(min-width: 768px)"
          sizes="(min-width: 1024px) 1440px, 100vw"
          className="scenic-hero-background object-cover"
          onReady={() => {
            setBackgroundReady(true);
            onReady();
          }}
        />
        <button
          ref={bookRef}
          type="button"
          onClick={onBookOpen}
          disabled={!issue.pdf_url}
          onPointerMove={moveBook}
          onPointerLeave={resetBook}
          aria-label={issue.pdf_url?`Read ${issue.title}`:`${issue.title} is not yet readable`}
          className="scenic-book-stage scenic-book-stage-positioned scenic-book-stage-settle focus-visible:outline-none disabled:cursor-not-allowed"
        >
          <span className="scenic-book-shadow" aria-hidden="true" />
          <span className="scenic-book block h-full w-full" style={{ '--book-spine-color': coverPalette.dominant, '--book-spine-foreground': coverPalette.foreground } as React.CSSProperties}>
            <span className="scenic-book-pages" aria-hidden="true" />
            <span className="scenic-book-spine" aria-hidden="true">
              <span className="scenic-book-spine-title">{issue.magazines.name}</span>
              <span className="scenic-book-spine-date">{monthName} {issue.year}</span>
              <span className="scenic-book-spine-publisher">Sri Aurobindo Society</span>
            </span>
            <ScenicBookCover issue={issue} sizes="310px" onCoverLoad={onCoverLoad}/>
          </span>
        </button>
      </div>

      <div className="scenic-hero-copy absolute bottom-[12.5%] left-[49.5%] top-[13%] flex w-[45%] flex-col justify-center text-[#153f63]" style={{ color: theme.text }}>
        <p className="max-w-full text-[0.76rem] font-semibold uppercase tracking-[0.27em] transition-colors duration-300" style={{ color: issueColours.body }}>{eyebrow}</p>
        <h1 className={cn('mt-5 max-w-[13ch] font-heading leading-[1.03] tracking-[-0.025em] transition-colors duration-300', compact ? 'text-[clamp(2.25rem,4vw,4rem)]' : 'text-[clamp(2.7rem,4.6vw,5rem)]')} style={{ color: issueColours.heading }}>
          {issue.theme || issue.title}
        </h1>
        {issue.description ? <HeroDescriptionSummary description={issue.description} color={issueColours.body} issueId={issue.id} /> : null}

        <div className="mt-8 flex items-center gap-3">
          {issue.pdf_url?<Link href={readerPath(issue.id)} onClick={() => rememberReaderSource(issue.id, 'shelf')} className="scenic-primary-action inline-flex min-h-12 items-center gap-3 rounded-xl px-7 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123e62]" style={{ background: issueColours.button, color: issueColours.buttonForeground }}>
            <BookOpen className="h-5 w-5" /> Read issue <ArrowRight className="h-4 w-4" />
          </Link>:<span className="inline-flex min-h-12 items-center gap-3 rounded-xl px-7 py-3 text-base font-semibold text-white transition-colors duration-300" style={{background:issueColours.button,color:issueColours.buttonForeground}}><BookOpen className="h-5 w-5"/>Embargoed</span>}
          <button type="button" onClick={onPreview} disabled={!issue.pdf_url} style={{color:issueColours.heading,borderColor:issueColours.body}} className="scenic-secondary-action inline-flex min-h-12 items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123e62] disabled:cursor-not-allowed disabled:opacity-50">
            <FileText className="h-5 w-5" /> Preview pages
          </button>
          <button type="button" onClick={onBookmark} style={{color:issueColours.heading,borderColor:issueColours.body}} aria-label={bookmarked ? 'Remove bookmark' : 'Save to bookmarks'} aria-pressed={bookmarked} className="scenic-secondary-action flex h-12 w-12 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123e62]">
            <Heart className={cn('h-5 w-5', bookmarked && 'fill-[#d97735] text-[#d97735]')} />
          </button>
        </div>

        {(issue.file_size_bytes || issue.page_count || sortedTopics.length > 0) && (
          <div style={{color:issueColours.body}} className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs transition-colors duration-300">
            {issue.file_size_bytes ? <span>{formatFileSize(issue.file_size_bytes)}</span> : null}
            {issue.page_count ? <span>{issue.page_count} pages</span> : null}
            {sortedTopics.map((topic) => <span key={topic}>{topic}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Embedded PDF reader (one issue, manual page turn) ----------
