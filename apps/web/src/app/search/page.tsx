import { getPublicNavigationFromDb } from '@/lib/db';
import { SearchClient } from './search-client';
import { Suspense } from 'react';
import { preload } from 'react-dom';
import { SearchLoading } from './search-loading';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

async function SearchPageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const get = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const query = get('q');
  if (query?.trim() && query.length <= 500) {
    const apiParams = new URLSearchParams({ q: query });
    const magazine = get('magazine_id');
    if (magazine && magazine !== 'all') apiParams.set('magazine_id', magazine);
    for (const key of ['year_from', 'year_to'] as const) {
      const value = get(key);
      if (value) apiParams.set(key, value);
    }
    const availability = get('availability');
    apiParams.set('availability', availability === 'all' || availability === 'subscriber' ? availability : 'read');
    preload(`/api/search?${apiParams}`, { as: 'fetch', crossOrigin: 'anonymous' });
  }
  const navigation = await getPublicNavigationFromDb();
  return <SearchClient navigation={navigation} />;
}

export default function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Suspense fallback={<SearchLoading />}><SearchPageContent searchParams={searchParams} /></Suspense>;
}
