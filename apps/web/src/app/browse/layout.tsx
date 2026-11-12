import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'All India Magazine Archive – Past Editions | Sri Aurobindo Society',
  description: 'Browse past editions of All India Magazine and Agnishikha from Sri Aurobindo Society. Discover issues exploring Integral Yoga, spirituality, consciousness and the teachings of Sri Aurobindo and the Mother.',
  path: '/browse',
});

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
