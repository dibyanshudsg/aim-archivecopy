import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Search Magazine Archive | Sri Aurobindo Society',
  description: 'Search All India Magazine and Agnishikha for magazine issues and writings related to Sri Aurobindo, the Mother, Integral Yoga, consciousness and spiritual life.',
  path: '/search',
  index: false,
  follow: true,
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
