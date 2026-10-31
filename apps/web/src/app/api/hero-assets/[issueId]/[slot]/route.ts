import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getDb, readHeroPresentation, type HeroArtworkSlot } from '@/lib/db';
import { releasedIssueSql } from '@/lib/embargo';
import { getR2Client, r2Bucket } from '@/lib/r2-client';

export const runtime='nodejs';
const headers={'Cache-Control':'public, max-age=300, stale-while-revalidate=3600','X-Content-Type-Options':'nosniff'};

export async function GET(request:Request,{params}:{params:Promise<{issueId:string;slot:string}>}){
  const {issueId,slot}=await params;
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(issueId)||(slot!=='desktop'&&slot!=='mobile'))return new Response(null,{status:404,headers});
  try{
    const released=await getDb().execute({sql:`SELECT id FROM issues WHERE id=? AND ${releasedIssueSql('issues')} LIMIT 1`,args:[issueId]});
    if(!released.rows[0])return new Response(null,{status:404,headers});
    const record=(await readHeroPresentation(issueId))[slot as HeroArtworkSlot];
    if(!record)return new Response(null,{status:404,headers});
    const object=await getR2Client().send(new GetObjectCommand({Bucket:r2Bucket(),Key:record.key}),{abortSignal:AbortSignal.any([request.signal,AbortSignal.timeout(30_000)])});
    if(!object.Body||object.ContentType!=='image/png'||!object.ContentLength||object.ContentLength>12*1024*1024)return new Response(null,{status:404,headers});
    return new Response(object.Body.transformToWebStream(),{headers:{...headers,'Content-Type':'image/png','Content-Length':String(object.ContentLength)}});
  }catch{return new Response(null,{status:503,headers});}
}
