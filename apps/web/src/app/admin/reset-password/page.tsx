import { Suspense } from 'react';
import { ResetPasswordClient } from './reset-password-client';

export const metadata = {
  title: 'Reset Password | All India Magazine Admin',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-amber-50/30 to-flame-50/20 px-4 py-12">
          <div className="h-64 w-full max-w-md animate-pulse rounded-3xl border border-amber-200/60 bg-white/70" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
