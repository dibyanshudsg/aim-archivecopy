import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { BrowseClient } from './browse-client';
import { BrowseLoading } from './loading';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { getPublicNavigationFromDb, readSiteSettingsFromDb } from '@/lib/db';
import {
  listPublicIssues,
  parsePublicIssueListInput,
  type BrowseFacets,
  type PublicIssueListInput,
} from '@/lib/public-issues';
import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const fetchInitialBrowseData = unstable_cache(async (
  input: PublicIssueListInput,
): Promise<{
  issues: ApiIssue[];
  magazines: ApiMagazine[];
  total: number;
  offset: number;
  totalPages: number;
  facets: BrowseFacets;
}> => {
  const result = await listPublicIssues(input);

  return {
    issues: result.data,
    magazines: result.magazines,
    total: result.total,
    offset: result.offset,
    totalPages: result.totalPages,
    facets: result.facets,
  };
}, ['browse-initial-data-v2'], { revalidate: 31_536_000, tags: ['public-archive'] });

const fetchBrowseSiteSettings = unstable_cache(
  readSiteSettingsFromDb,
  ['browse-site-settings-v1'],
  { revalidate: 31_536_000, tags: ['public-archive'] },
);

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const input = parsePublicIssueListInput({
    ...params,
    page_size: params.page_size ?? '24',
    row_fill: params.row_fill ?? '6',
  });
  const [{ issues, magazines, total, offset, totalPages, facets }, navigation, siteSettings] = await Promise.all([
    fetchInitialBrowseData(input),
    getPublicNavigationFromDb(),
    fetchBrowseSiteSettings(),
  ]);

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All India Magazine Archive – Past Editions',
    description: 'Browse past editions of All India Magazine and Agnishikha from Sri Aurobindo Society.',
    url: siteUrl('/browse'),
    isPartOf: { '@type': 'WebSite', name: 'AIM Archive', url: siteUrl('/') },
    about: [
      { '@type': 'Periodical', name: 'All India Magazine' },
      { '@type': 'Periodical', name: 'Agnishikha' },
    ],
  };

  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd).replace(/</g, '\\u003c') }} />
    <Suspense fallback={<BrowseLoading navigation={navigation} />}>
      <BrowseClient
        initialIssues={issues}
        initialMagazines={magazines}
        initialTotal={total}
        initialOffset={offset}
        initialTotalPages={totalPages}
        initialFacets={facets}
        navigation={navigation}
        archiveGrowthNote={siteSettings.archive_growth_note}
      />
    </Suspense>
  </>);
}
