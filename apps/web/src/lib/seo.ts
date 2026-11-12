import type { Metadata } from 'next';

export const SITE_NAME = 'AIM Archive';
export const SITE_ALTERNATE_NAME = 'All India Magazine Archive';
export const PUBLISHER_NAME = 'Sri Aurobindo Society';
export const PRODUCTION_ORIGIN = 'https://aim.aurosociety.org';

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return PRODUCTION_ORIGIN;
  try {
    const url = new URL(configured);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {
    // Invalid deployment configuration falls back to the approved origin.
  }
  return PRODUCTION_ORIGIN;
}

export function siteUrl(path = '/'): string {
  return new URL(path, `${siteOrigin()}/`).toString();
}

export function robotsMetadata(index = true, follow = true): Metadata['robots'] {
  const previewDeployment = Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production');
  const allowIndex = previewDeployment ? false : index;
  const allowFollow = previewDeployment ? false : follow;
  return {
    index: allowIndex,
    follow: allowFollow,
    googleBot: { index: allowIndex, follow: allowFollow },
  };
}

type SocialImage = string | { url: string; alt?: string; width?: number; height?: number };

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  follow = true,
  images = ['/api/brand/social'],
  openGraphType = 'website',
  canonical = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  images?: SocialImage[];
  openGraphType?: 'website' | 'article';
  canonical?: boolean;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: canonical ? { canonical: path } : undefined,
    robots: robotsMetadata(index, follow),
    openGraph: { title, description, url: path, type: openGraphType, locale: 'en_IN', siteName: SITE_NAME, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
