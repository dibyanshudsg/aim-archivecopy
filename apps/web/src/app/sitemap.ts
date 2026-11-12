import type { MetadataRoute } from 'next';
import { listSitemapIssues } from '@/lib/db';
import { siteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl('/') },
    { url: siteUrl('/browse') },
  ];

  // Dynamic issue pages. Do not fail the whole production build if the
  // deployment environment is missing DB credentials; static URLs are still
  // better than no deployment, and runtime DB-backed routes report their own
  // errors separately.
  const issues = await listSitemapIssues().catch((error) => {
    console.warn('Skipping issue sitemap entries:', error instanceof Error ? error.message : error);
    return [];
  });

  const issuePages: MetadataRoute.Sitemap = (issues || []).map((issue) => ({
    url: siteUrl(`/issue/${issue.id}`),
    lastModified: new Date(issue.updated_at),
  }));

  return [...staticPages, ...issuePages];
}
