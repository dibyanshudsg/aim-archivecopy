import { getPublicIssueById, getPublicNavigationFromDb, listRelatedReadableIssues } from '@/lib/db';
import type { ApiIssue } from '@/lib/api';
import { IssueDetailClient } from './issue-detail-client';
import { notFound } from 'next/navigation';
import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import { siteUrl } from '@/lib/seo';

// Per-id ISR: each issue's HTML is edge-cached for a minute, so back-button
// navigation from the reader is near-instant on repeat visits while still
// picking up edits within ~60 s.
export const revalidate = 60;

async function fetchIssueServer(id: string): Promise<ApiIssue | null> {
  return getPublicIssueById(id);
}

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

  const relatedIssues = await listRelatedReadableIssues(issue);
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
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(issueJsonLd).replace(/</g, '\\u003c') }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} /><IssueDetailClient initialIssue={issue} navigation={navigation} relatedIssues={relatedIssues} /></>;
}
