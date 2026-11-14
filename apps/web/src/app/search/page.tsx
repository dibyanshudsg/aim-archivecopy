import { getPublicNavigationFromDb, listMagazines } from '@/lib/db';
import { SearchClient } from './search-client';
import { Suspense } from 'react';
import { SearchLoading } from './search-loading';

// Admin mutations invalidate the public-archive cache tag.
// Caching the public search shell allows instant route prefetching and 0ms navigation.
export const revalidate = 31_536_000;

async function SearchPageContent() {
  const [navigation, magazines] = await Promise.all([
    getPublicNavigationFromDb(),
    listMagazines({ orderBy: 'created_at' }),
  ]);
  return <SearchClient navigation={navigation} initialMagazines={magazines} />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}
