import { Suspense } from 'react';
import { BrowseClient } from './browse-client';
import { BrowseLoading } from './loading';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { getPublicNavigationFromDb, readSiteSettingsFromDb } from '@/lib/db';
import {
  listPublicIssues,
  parsePublicIssueListInput,
  type BrowseFacets,
} from '@/lib/public-issues';
import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

async function fetchInitialBrowseData(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<{
  issues: ApiIssue[];
  magazines: ApiMagazine[];
  total: number;
  totalPages: number;
  facets: BrowseFacets;
}> {
  const result = await listPublicIssues(
    parsePublicIssueListInput({ ...searchParams, page_size: searchParams.page_size ?? '24' }),
  );

  return {
    issues: result.data,
    magazines: result.magazines,
    total: result.total,
    totalPages: result.totalPages,
    facets: result.facets,
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [{ issues, magazines, total, totalPages, facets }, navigation, siteSettings] = await Promise.all([
    fetchInitialBrowseData(params),
    getPublicNavigationFromDb(),
    readSiteSettingsFromDb(),
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
        initialTotalPages={totalPages}
        initialFacets={facets}
        navigation={navigation}
        archiveGrowthNote={siteSettings.archive_growth_note}
      />
    </Suspense>
  </>);
}
