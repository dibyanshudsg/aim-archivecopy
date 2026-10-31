import { StorageClient } from './storage-client';
import { verifyAdmin } from '@/lib/admin-auth';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StoragePage() {
  const admin = await verifyAdmin('storage.view');
  if (!admin) notFound();
  return <StorageClient initialData={null} readOnly={!admin.permissions.includes('storage.manage')} />;
}
