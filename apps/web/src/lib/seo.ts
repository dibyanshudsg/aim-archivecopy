import type { Metadata } from 'next';

export const SITE_NAME = 'AIM Archive';
export const SITE_ALTERNATE_NAME = 'All India Magazine Archive';
export const PUBLISHER_NAME = 'Sri Aurobindo Society';
export const PRODUCTION_ORIGIN = 'https://aim.aurosociety.org';

export function siteOrigin(): string {
  const isVercel = Boolean(process.env.VERCEL);
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // If configured, use it unless we are in Vercel and it points to localhost
  if (configured) {
    const isLocal = configured.includes('localhost') || configured.includes('127.0.0.1');
    if (!isVercel || !isLocal) {
      try {
        const url = new URL(configured);
        if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
      } catch {
        // Invalid deployment configuration falls back to the approved origin.
      }
    }
  }

  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_ORIGIN;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

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

type SocialImage = string | { url: string; alt?: string; width?: number; height?: number; type?: string } | URL;

const DEFAULT_SOCIAL_IMAGES: SocialImage[] = [
  {
    url: '/api/brand/social',
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: SITE_NAME,
  },
];

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  follow = true,
  images = DEFAULT_SOCIAL_IMAGES,
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
