import { getPublicIssueById, getPublicIssueMetadataById } from '@/lib/db';
import { preload } from 'react-dom';
import { ReaderIssueProvider } from './reader-issue-context';
import type { Metadata } from 'next';
import { pageMetadata, robotsMetadata } from '@/lib/seo';

// Issue metadata changes infrequently. Including it in the route payload lets
// the reader request its cover, worker, and PDF as soon as navigation finishes
// instead of waiting for a second client-side API waterfall.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const issue = await getPublicIssueMetadataById(id);
  if (!issue) return { title: { absolute: 'Reader | AIM Archive' }, robots: robotsMetadata(false, true) };
  const subject = issue.theme?.trim() || issue.title;
  return pageMetadata({
    title: `Read ${subject} – ${issue.magazineName}`,
    description: issue.description || `Read ${subject} from ${issue.magazineName} in the AIM Archive.`,
    path: `/read/${id}`,
    index: false,
    follow: true,
    canonical: false,
  });
}

export default async function ReaderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getPublicIssueById(id);

  if (issue?.pdf_url) {
    preload(issue.pdf_url, { as: 'fetch', crossOrigin: 'anonymous' });
  }

  return <ReaderIssueProvider issue={issue}>{children}</ReaderIssueProvider>;
}
