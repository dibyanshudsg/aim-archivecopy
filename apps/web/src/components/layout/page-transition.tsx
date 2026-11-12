'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { BrowseLoading } from '@/app/browse/loading';
import { SearchLoading } from '@/app/search/search-loading';
import { BookmarksLoading } from '@/app/bookmarks/bookmarks-loading';
import { HomeLoading } from '@/app/loading';
import IssueDetailLoading from '@/app/issue/[id]/loading';
import { ReaderOpeningState } from '@/components/reader/reader-opening-state';

const loadingPages = {
  '/': HomeLoading,
  '/browse': BrowseLoading,
  '/search': SearchLoading,
  '/bookmarks': BookmarksLoading,
} as const;
type LoadingPath = keyof typeof loadingPages;

function loadingPageFor(pathname: string) {
  if (pathname.startsWith('/read/')) return ReaderOpeningState;
  if (pathname.startsWith('/issue/')) return IssueDetailLoading;
  return loadingPages[pathname as LoadingPath] ?? null;
}

/**
 * Internal public navigation gets immediate route-specific feedback while
 * Next prepares the destination route.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  useEffect(() => { setPendingPath(null); }, [pathname]);
  useEffect(() => {
    if (!pendingPath) return;
    const timeout = window.setTimeout(() => setPendingPath(null), 15000);
    const clear = () => setPendingPath(null);
    window.addEventListener('popstate', clear);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('popstate', clear);
    };
  }, [pendingPath]);

  function handleNavigationClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname === pathname) return;
    if (!loadingPageFor(destination.pathname)) return;
    flushSync(() => setPendingPath(destination.pathname));
  }

  // Admin routes have their own persistent sidebar shell. Keying the whole
  // app by pathname remounts that shell on every sidebar click, which causes a
  // white flash and repeats admin boot work. Keep admin transitions local.
  if (pathname?.startsWith('/admin')) return <>{children}</>;

  const PendingLoading = pendingPath ? loadingPageFor(pendingPath) : null;

  return <>
    <div onClickCapture={handleNavigationClick}>
      {children}
    </div>
    {PendingLoading && pathname !== pendingPath && (
      <div className="route-loading-scroll fixed inset-0 z-[60] overflow-y-auto bg-white" aria-label="Opening page">
        <PendingLoading />
      </div>
    )}
  </>;
}
