import {
  getPublicNavigationFromDb,
  getPublicCollectionSummary,
  listHomeShelfIssues,
  listHomeShelfYears,
  listLatestEmbargoedIssues,
  listMagazines,
  getPublicIssueById,
  readHeroPresentation,
  listReleasedReadyHeroIssueIds,
  readGlobalHeroPlacements,
  readSiteSettingsFromDb,
} from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import type { ShelfIssue } from '@/lib/home-shelf';
import { HomeClient } from './home-client';
import { readableCutoffIssueMonth } from '@/lib/embargo';
import { getHeroScheduleAndCatalogue } from '@/lib/hero-issues';
import type { HeroPickerIssue } from '@/lib/hero-picker-issue';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

/** Readable shelf; restricted editions have their own section. */
const fetchShelfIssues = unstable_cache(async (_window: string): Promise<{ issues: ShelfIssue[]; years: Awaited<ReturnType<typeof listHomeShelfYears>> }> => {
  void _window; // Included in Next's persistent cache key at embargo rollover.
  const years = await listHomeShelfYears();
  const year = years.at(-1)?.year;
  return { years, issues: year === undefined ? [] : await listHomeShelfIssues(240, year) };
}, ['home-shelf'], { revalidate: 30, tags: ['public-archive'] });

const fetchCollectionSummary = unstable_cache(async (_window: string) => { void _window; return getPublicCollectionSummary(); },
  ['home-collection'], { revalidate: 30, tags: ['public-archive'] });

async function fetchLatestSubscriberEditions(): Promise<ApiIssue[]> {
  return listLatestEmbargoedIssues(4, 32);
}

interface CarouselData {
  magazines: ApiMagazine[];
  issues: ApiIssue[];
  pickerIssues: HeroPickerIssue[];
}

/**
 * Feature the currently selected issue for each magazine. The schedule handles
 * the India-time release gate, persistent hides and optional manual selection.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const [magazines, heroCatalogue, placements] = await Promise.all([
    listMagazines({ orderBy: 'created_at' }),
    getHeroScheduleAndCatalogue(),
    readGlobalHeroPlacements(),
  ]);
  const { schedule, catalogue: pickerIssues } = heroCatalogue;
  const scheduledIds = schedule.map((item) => item.live?.id).filter((id): id is string => Boolean(id));
  const preparedIds=await listReleasedReadyHeroIssueIds();
  const ids=[...new Set([...scheduledIds,...preparedIds])];
  const issues = (await Promise.all(ids.map(async (id):Promise<ApiIssue|null> => {
    const [issue,presentation]=await Promise.all([getPublicIssueById(id),readHeroPresentation(id)]);
    if(!issue)return null;
    const heroIssue={...issue,cover_image_url:issue.cover_image_url&&issue.updated_at?`${issue.cover_image_url}?v=${encodeURIComponent(issue.updated_at)}`:issue.cover_image_url};
    if(!presentation.desktop)return {...heroIssue,hero:{desktopUrl:'/aim-oct-2026-hero.png',mobileUrl:null,desktopTheme:{layout:placements},mobileTheme:{layout:placements}}};
    return {...heroIssue,hero:{desktopUrl:`/api/hero-assets/${id}/desktop?v=${encodeURIComponent(presentation.desktop.hash)}`,mobileUrl:presentation.mobile?`/api/hero-assets/${id}/mobile?v=${encodeURIComponent(presentation.mobile.hash)}`:null,desktopTheme:{...JSON.parse(presentation.desktop.theme),layout:placements},mobileTheme:presentation.mobile?{...JSON.parse(presentation.mobile.theme),layout:placements}:null}};
  }))).filter((issue): issue is ApiIssue => issue !== null);
  return { magazines, issues, pickerIssues };
}

export default async function HomePage() {
  const cutoff = readableCutoffIssueMonth();
  const windowKey = `${cutoff.year}-${cutoff.month}`;
  const [recentIssues, latestSubscriberEditions, carousel, navigation, collection, siteSettings] = await Promise.all([
    fetchShelfIssues(windowKey),
    fetchLatestSubscriberEditions(),
    fetchCarouselData(),
    getPublicNavigationFromDb(),
    fetchCollectionSummary(windowKey),
    readSiteSettingsFromDb(),
  ]);

  return (
    <HomeClient
      recentIssues={recentIssues.issues}
      shelfYears={recentIssues.years}
      latestSubscriberEditions={latestSubscriberEditions}
      carouselMagazines={carousel.magazines}
      carouselIssues={carousel.issues}
      pickerIssues={carousel.pickerIssues}
      navigation={navigation}
      collection={collection}
      siteSettings={siteSettings}
    />
  );
}
