'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, BookOpenText, Search, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { LatestSubscriberEditions } from '@/components/home/latest-subscriber-editions';

const AimHistorySection = dynamic(() =>
  import('@/components/home/aim-history-section').then((module) => module.AimHistorySection),
);

import { ThisMonthFeatured } from '@/components/home/this-month-featured';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import type { ShelfIssue, ShelfYear } from '@/lib/home-shelf';
import { isEmbargoed } from '@/lib/embargo';
import {
  formatRelativeTime,
  getRecentReads,
  type ReadingHistoryEntry,
} from '@/lib/reading-history';
import { readerPath, rememberDirectResume, rememberReaderSource } from '@/lib/reader-url';
import { formatMonthYear } from '@/lib/utils';
import type { PublicNavigation } from '@/lib/navigation';
import type { SiteSettings } from '@/lib/site-settings';

const AnimatedBookshelf = dynamic(() =>
  import('@/components/home/animated-bookshelf').then((module) => module.AnimatedBookshelf),
);
import type { HeroPickerIssue } from '@/lib/hero-picker-issue';


// Slide-up entrance — no opacity gate. Opacity transitions block LCP measurement
// (the element isn't "contentful" while opacity:0), so we keep the element fully
// visible from first paint and animate position only. Saves ~1s of LCP delay
// on /, since the hero subtitle is the LCP element.
const fadeInUp = {
  hidden: { y: 20 },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};


interface HomeClientProps {
  recentIssues: ShelfIssue[];
  shelfYears: ShelfYear[];
  latestSubscriberEditions: ApiIssue[];
  carouselMagazines: ApiMagazine[];
  carouselIssues: ApiIssue[];
  pickerIssues: HeroPickerIssue[];
  navigation: PublicNavigation;
  collection: { listed: number; readable: number; languages: string[] };
  siteSettings: SiteSettings;
}

function ContinueReadingShelf({ featuredIds }: { featuredIds: string }) {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);

  useEffect(() => {
    // Drop locally-saved entries for issues that fell back into the 5-year
    // embargo window — resuming them would just bounce the user off the
    // reader's locked-state screen.
    const featured = new Set(featuredIds.split(','));
    setEntries(getRecentReads(6).filter((e) => featured.has(e.issueId) || !isEmbargoed(e.year, e.month)).slice(0, 3));
  }, [featuredIds]);

  if (entries.length === 0) return null;

  return (
    <motion.div
      className="relative mx-auto mt-10 w-full max-w-[1440px]"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-xl border border-flame-100 bg-white/85 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600">
              <BookOpenText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-900">Continue reading</h2>
              <p className="text-xs text-gray-500">Pick up from your last saved page</p>
            </div>
          </div>
          <Link
            href="/bookmarks"
            className="rounded-lg border border-flame-200 bg-white px-3 py-2 text-xs font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
          >
            Saved
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {entries.map((entry) => {
            const progressPct = entry.numPages
              ? Math.min(100, Math.max(3, (entry.page / entry.numPages) * 100))
              : 0;

            return (
              <Link
                key={entry.issueId}
                href={readerPath(entry.issueId, entry.page)}
                onClick={() => {
                  rememberReaderSource(entry.issueId, 'shelf');
                  rememberDirectResume(entry.issueId);
                }}
                className="group flex min-w-0 items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 text-left transition-all hover:border-flame-200 hover:bg-flame-50/40 hover:shadow-sm active:border-flame-200 active:bg-flame-50/40 active:shadow-sm"
              >
                <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-50 shadow-sm">
                  <div className="absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
                  {entry.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold text-flame-700">
                      {entry.magazineName}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-flame-800 group-active:text-flame-800">
                    {entry.title}
                  </p>
                  {entry.theme && (
                    <div className="mt-0.5 flex items-start gap-1.5">
                      <span aria-hidden className="mt-1.5 h-2.5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500" />
                      <p className="font-heading truncate pr-1 pt-0.5 text-[12px] font-bold leading-normal text-flame-800">
                        {entry.theme}
                      </p>
                    </div>
                  )}
                  <p className="truncate text-xs text-gray-500">
                    {formatMonthYear(entry.month, entry.year)}
                  </p>
                  {entry.numPages && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-500 to-flame-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Page {entry.page}
                    {entry.numPages ? ` / ${entry.numPages}` : ''} - {formatRelativeTime(entry.updatedAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}


export function HomeClient({
  recentIssues,
  shelfYears,
  latestSubscriberEditions,
  carouselMagazines,
  carouselIssues,
  pickerIssues,
  navigation,
  collection,
  siteSettings,
}: HomeClientProps) {
  const [heroPreviewOpen, setHeroPreviewOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} autoHideOnHome suppressed={heroPreviewOpen} />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#fffaf1] via-[#fffdf8] to-white px-4 pb-12 pt-5 sm:px-6 sm:pb-20 sm:pt-9 md:px-0 md:pt-0">
          <ThisMonthFeatured
            magazines={carouselMagazines}
            issues={carouselIssues}
            archiveIssues={pickerIssues}
            onPreviewChange={setHeroPreviewOpen}
          />

          <section className="mx-auto mt-8 w-full max-w-[1440px] px-4 py-6 sm:mt-16 sm:px-6 sm:py-10 lg:px-10" aria-labelledby="archive-intro-title">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
              <div className="mx-auto w-fit max-w-full">
                <h2
                  id="archive-intro-title"
                  className="font-cursive text-[clamp(2.25rem,8.4vw,4.5rem)] font-bold leading-[0.95] text-flame-600 whitespace-nowrap"
                >
                  “{siteSettings.archive_intro_quote}”
                </h2>
                <p className="font-heading mt-2 text-right text-xs font-semibold tracking-wider text-flame-900 sm:text-sm md:text-base">
                  — {siteSettings.archive_intro_attribution}
                </p>
              </div>
              <p className="mt-5 max-w-4xl text-base leading-relaxed text-gray-700 sm:text-lg text-justify [text-align-last:center] hyphens-auto">
                {siteSettings.archive_intro_description}
              </p>
            </div>

            {/* Section-wide History of AIM Card */}
            <AimHistorySection />
          </section>


          {/* Dynamic Bookshelf */}
          <motion.div
            className="relative mx-auto mt-10 w-full max-w-[1440px] sm:mt-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatedBookshelf issues={recentIssues} years={shelfYears} archiveGrowthNote={siteSettings.archive_growth_note} />
          </motion.div>

          <ContinueReadingShelf featuredIds={carouselIssues.map((issue) => issue.id).join(',')} />
          <LatestSubscriberEditions issues={latestSubscriberEditions} />

          {/* Archive Stats */}
          <motion.div
            className="relative mx-auto mt-16 grid w-full max-w-[1440px] grid-cols-3 gap-4 border-t border-flame-100 pt-10 text-center sm:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { label: 'Publicly listed editions', value: collection.listed.toLocaleString() },
              { label: 'Readable now', value: collection.readable.toLocaleString() },
              { label: 'Print editions (5-yr embargo)', value: (collection.listed - collection.readable).toLocaleString() },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-3xl font-bold text-flame-700 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
          <p className="mx-auto mt-5 w-full max-w-[1440px] text-center text-sm leading-relaxed text-gray-600">
            {collection.languages.length ? `Languages in the listed collection: ${collection.languages.join(', ')}.` : 'No editions are listed yet.'}
            {' '}Counts describe the online catalogue, including restricted editions, not the complete print collection.
          </p>
        </section>


        {/* CTA Section */}
        <section className="bg-gradient-to-b from-white to-flame-50/40 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <motion.div
            className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-flame-100/80 bg-white/90 p-6 text-center shadow-sm sm:p-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Header: matching Image 3 style */}
            <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600 ring-1 ring-flame-100 shrink-0">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-xs font-semibold tracking-wider uppercase text-flame-700">
                  Decades of Spiritual Heritage
                </p>
              </div>
              <h2 className="font-heading text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Step into Decades of Spiritual Light
              </h2>
            </motion.div>

            {/* Subtitle */}
            <motion.p variants={fadeInUp} className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
              Immerse yourself in timeless writings and sacred guidance from Sri Aurobindo and The Mother on Integral Yoga, inner consciousness, and the Life Divine.
            </motion.p>

            {/* Dual CTA buttons */}
            <motion.div variants={fadeInUp} className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/browse"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-6 text-sm font-semibold text-white shadow-xs transition-all hover:from-gold-600 hover:to-flame-600"
              >
                <span>Explore the Archive</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-flame-200/90 bg-white px-5 text-sm font-semibold text-flame-800 shadow-2xs transition-colors hover:border-flame-400 hover:bg-flame-50/50 hover:text-flame-900"
              >
                <Search className="h-4 w-4 text-flame-600 shrink-0" aria-hidden="true" />
                <span>Search by Subject</span>
              </Link>
            </motion.div>

            {/* Access Policy Note Pill */}
            <motion.div variants={fadeInUp} className="mt-6 border-t border-flame-100/70 pt-4">
              <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                <span>Open Public Access &middot; Archival issues freely readable 5 years after publication</span>
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer navigation={navigation} />
    </div>
  );
}
