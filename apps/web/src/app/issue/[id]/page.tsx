import { getPublicIssueById, getPublicNavigationFromDb, listRelatedReadableIssues } from '@/lib/db';
import { normalizeIssue, type ApiIssue } from '@/lib/api';
import { IssueDetailClient } from './issue-detail-client';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import { siteUrl } from '@/lib/seo';
import { IssueCard } from '@/components/magazine/issue-card';

// Admin mutations explicitly revalidate issue routes and the public-archive
// tag, so unchanged issue pages can remain cached for a year.
export const revalidate = 31_536_000;

const fetchIssueServer = unstable_cache(
  async (id: string): Promise<ApiIssue | null> => getPublicIssueById(id),
  ['issue-detail-page-v2'],
  { revalidate: 31_536_000, tags: ['public-archive'] },
);

const fetchRelatedIssues = unstable_cache(
  async (issue: ApiIssue) => listRelatedReadableIssues(issue, 6),
  ['issue-related-v1'],
  { revalidate: 31_536_000, tags: ['public-archive'] },
);

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [issue, navigation] = await Promise.all([
    fetchIssueServer(id),
    getPublicNavigationFromDb(),
  ]);

  if (!issue) {
    notFound();
  }

  const monthYear = `${MONTH_NAMES[issue.month as MonthIndex]} ${issue.year}`;
  const subject = issue.theme?.trim() || issue.title;
  const description = issue.description?.trim() || `Explore ${subject}, the ${monthYear} edition of ${issue.magazines.name} from Sri Aurobindo Society.`;
  const issueJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PublicationIssue',
    name: subject,
    url: siteUrl(`/issue/${issue.id}`),
    dateModified: issue.updated_at,
    description,
    inLanguage: issue.magazines.language === 'hindi' ? 'hi' : 'en',
    image: issue.cover_image_url ? siteUrl(`/api/issues/${issue.id}/cover`) : undefined,
    isPartOf: { '@type': 'Periodical', name: issue.magazines.name, publisher: { '@type': 'Organization', name: 'Sri Aurobindo Society', url: 'https://aurosociety.org/' } },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Browse Archive', item: siteUrl('/browse') },
      { '@type': 'ListItem', position: 3, name: subject, item: siteUrl(`/issue/${issue.id}`) },
    ],
  };
  return (
    <>
      <script
        key="issue-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(issueJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        key="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <IssueDetailClient
        key={issue.id}
        initialIssue={issue}
        navigation={navigation}
        relatedSection={
          <Suspense key="related-issues-suspense" fallback={<RelatedIssuesLoading />}>
            <RelatedIssues issue={issue} />
          </Suspense>
        }
      />
    </>
  );
}

async function RelatedIssues({ issue }: { issue: ApiIssue }) {
  const relatedIssues = await fetchRelatedIssues(issue);
  if (relatedIssues.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="related-heading">
      <h2 id="related-heading" className="font-heading mb-5 text-2xl font-semibold text-gray-900">
        Readable editions to explore
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {relatedIssues.map((related, index) => (
          <div key={related.id}>
            <IssueCard issue={normalizeIssue(related)} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedIssuesLoading() {
  return (
    <section className="mt-14" aria-label="Loading related editions" aria-busy="true">
      <div className="mb-5 h-8 w-72 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-flame-50 motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}
