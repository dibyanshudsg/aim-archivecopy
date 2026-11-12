import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { WebVitals } from '@/components/web-vitals';
import '@/styles/globals.css';
import { ContinueReadingFab } from '@/components/layout/continue-reading-fab';
import { PageTransition } from '@/components/layout/page-transition';
import { PRODUCTION_ORIGIN, PUBLISHER_NAME, SITE_ALTERNATE_NAME, SITE_NAME, pageMetadata, siteOrigin, siteUrl } from '@/lib/seo';

// Each next/font is given a UNIQUE CSS variable name. The composed
// `--font-heading` / `--font-sans` / etc. tokens in `globals.css` then
// reference these variables so the actual loaded font-family strings
// (which next/font obfuscates, like `__Aboreto_abc123`) get substituted
// into the cascade at render time. Without this composition, only the
// primary font of each token would actually load — fallback fonts
// (e.g. Tiro Devanagari Hindi for Hindi glyphs) would silently miss.
const inter = localFont({
  src: './fonts/Inter-variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
});

const aboreto = localFont({
  src: './fonts/Aboreto-Regular.woff2',
  weight: '400',
  variable: '--font-aboreto',
  display: 'swap',
});

const tiroDevanagari = localFont({
  src: './fonts/TiroDevanagariHindi-Regular.woff2',
  weight: '400',
  variable: '--font-tiro-deva',
  display: 'swap',
});

const tangerine = localFont({
  src: [
    { path: './fonts/Tangerine-Regular.woff2', weight: '400' },
    { path: './fonts/Tangerine-Bold.woff2', weight: '700' },
  ],
  variable: '--font-tangerine',
  preload: false,
  display: 'swap',
});

const homeTitle = 'All India Magazine – Sri Aurobindo Society';
const homeDescription = 'Explore All India Magazine and Agnishikha, publications of Sri Aurobindo Society, featuring the writings of Sri Aurobindo and the Mother on Integral Yoga, spirituality and the evolution of consciousness.';

export const metadata: Metadata = {
  ...pageMetadata({ title: homeTitle, description: homeDescription, path: '/' }),
  title: {
    default: homeTitle,
    template: '%s | AIM Archive',
  },
  keywords: [
    'All India Magazine',
    'All India Magazine archive',
    'Agnishikha',
    'Sri Aurobindo',
    'The Mother',
    'Sri Aurobindo Society',
    'Sri Aurobindo writings',
    'The Mother writings',
    'Integral Yoga',
    'spirituality',
    'evolution of consciousness',
    'spiritual transformation',
    'magazine archive',
  ],
  metadataBase: new URL(siteOrigin()),
  icons: { icon: '/api/brand/favicon', apple: '/api/brand/favicon' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${PRODUCTION_ORIGIN}/#organization`,
      name: PUBLISHER_NAME,
      url: 'https://aurosociety.org/',
      logo: { '@type': 'ImageObject', url: siteUrl('/api/brand/logo') },
    },
    {
      '@type': 'WebSite',
      '@id': `${PRODUCTION_ORIGIN}/#website`,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      description: homeDescription,
      url: siteUrl('/'),
      publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: siteUrl('/search?q={search_term_string}') },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${aboreto.variable} ${tiroDevanagari.variable} ${tangerine.variable}`}
    >
      <body className="bg-warm-white font-sans text-gray-900 antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PageTransition>{children}</PageTransition>
        <ContinueReadingFab />
        {process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true' && <WebVitals />}
      </body>
    </html>
  );
}
