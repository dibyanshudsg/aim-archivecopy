import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'My Bookmarks | AIM Archive',
  description: 'Your saved magazine issues from the AIM Archive.',
  path: '/bookmarks',
  index: false,
  follow: true,
});

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
