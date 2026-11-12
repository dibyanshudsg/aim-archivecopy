import type { Metadata } from 'next';
import { getPublicIssueMetadataById } from '@/lib/db';
import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import { pageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = await getPublicIssueMetadataById(id);
  if (!issue) notFound();

  const monthYear = `${MONTH_NAMES[issue.month as MonthIndex]} ${issue.year}`;
  const subject = issue.theme?.trim() || issue.title;
  const title = `${subject} – ${issue.magazineName}, ${monthYear}`;
  const description = issue.description?.trim() || `Explore ${subject}, the ${monthYear} edition of ${issue.magazineName} from Sri Aurobindo Society.`;
  const images = issue.hasCover ? [{ url: `/api/issues/${id}/cover`, alt: `${issue.magazineName} — ${monthYear} cover` }] : undefined;
  return pageMetadata({ title, description, path: `/issue/${id}`, index: !issue.isEmbargoed, follow: true, images, openGraphType: 'article' });
}

export default function IssueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
