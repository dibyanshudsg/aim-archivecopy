import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getDb, readHeroPresentation, type HeroArtworkSlot } from '@/lib/db';
import { releasedIssueSql } from '@/lib/embargo';
import { getR2Client, r2Bucket } from '@/lib/r2-client';

export const runtime='nodejs';
const headers={'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'};

interface CachedHeroAsset {
  body: Buffer;
  hash: string;
  type: string;
  length: number;
}
const heroMemoryCache = new Map<string, CachedHeroAsset>();

const ALLOWED_HERO_TYPES = ['image/avif', 'image/webp', 'image/png', 'image/jpeg'];

export async function GET(request:Request,{params}:{params:Promise<{issueId:string;slot:string}>}){
  const {issueId,slot}=await params;
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(issueId)||(slot!=='desktop'&&slot!=='mobile'))return new Response(null,{status:404,headers});
  const url = new URL(request.url);
  const version = url.searchParams.get('v');
  const cacheKey = `${issueId}:${slot}`;
  const cached = heroMemoryCache.get(cacheKey);
  if (cached && (!version || cached.hash === version)) {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === `"${cached.hash}"`) {
      return new Response(null, { status: 304, headers: { ...headers, ETag: `"${cached.hash}"` } });
    }
    return new Response(new Uint8Array(cached.body), {
      headers: { ...headers, 'Content-Type': cached.type, 'Content-Length': String(cached.length), ETag: `"${cached.hash}"` },
    });
  }

  try{
    const released=await getDb().execute({sql:`SELECT id FROM issues WHERE id=? AND ${releasedIssueSql('issues')} LIMIT 1`,args:[issueId]});
    if(!released.rows[0])return new Response(null,{status:404,headers});
    const record=(await readHeroPresentation(issueId))[slot as HeroArtworkSlot];
    if(!record)return new Response(null,{status:404,headers});
    const object=await getR2Client().send(new GetObjectCommand({Bucket:r2Bucket(),Key:record.key}),{abortSignal:AbortSignal.any([request.signal,AbortSignal.timeout(30_000)])});
    const contentType = object.ContentType || 'image/avif';
    if(!object.Body||!ALLOWED_HERO_TYPES.includes(contentType)||!object.ContentLength||object.ContentLength>12*1024*1024)return new Response(null,{status:404,headers});

    const stream = object.Body.transformToWebStream();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    heroMemoryCache.set(cacheKey, { body, hash: record.hash, type: contentType, length: body.length });

    return new Response(new Uint8Array(body),{headers:{...headers,'Content-Type':contentType,'Content-Length':String(body.length),ETag:`"${record.hash}"`}});
  }catch{return new Response(null,{status:503,headers});}
}
