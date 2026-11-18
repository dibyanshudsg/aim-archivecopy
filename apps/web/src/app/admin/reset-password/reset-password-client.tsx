'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ email?: string; name?: string }>({});

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    let active = true;

    async function checkToken() {
      try {
        const res = await fetch(`/api/admin/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => null);

        if (active) {
          if (res.ok && data?.valid) {
            setTokenValid(true);
            setAdminInfo({ email: data.email, name: data.name });
          } else {
            setTokenValid(false);
          }
        }
      } catch {
        if (active) setTokenValid(false);
      } finally {
        if (active) setVerifying(false);
      }
    }

    checkToken();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Could not reset password. Please try again.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-amber-50/30 to-flame-50/20 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-amber-200/80 bg-white p-8 shadow-[0_12px_40px_rgba(120,84,28,0.08)] sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-100 to-flame-100 shadow-xs">
              <Image src="/logo.png" alt="Sri Aurobindo" width={32} height={32} className="object-contain" />
            </div>
            <h1 className="font-heading text-xl font-bold text-gray-900 sm:text-2xl">
              Reset Password
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-gray-500 sm:text-sm">
              {adminInfo.email ? `Create a new password for ${adminInfo.email}` : 'Create a new secure password for your account'}
            </p>
          </div>

          {verifying ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <LoaderCircle className="h-6 w-6 animate-spin text-flame-600" />
              <p className="text-xs text-gray-500 font-medium">Verifying reset link…</p>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-gray-900">
                  Invalid or Expired Link
                </h2>
                <p className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                  This password reset link is invalid, has expired, or has already been used. Password reset links expire after 30 minutes for your security.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  href="/admin/forgot-password"
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
                >
                  Request a new reset link
                </Link>
                <Link
                  href="/admin/login"
                  className="flex w-full items-center justify-center rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-gray-900">
                  Password updated successfully
                </h2>
                <p className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                  Your administrator password has been updated. You can now sign in with your new credentials.
                </p>
              </div>

              <Link
                href="/admin/login"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
              >
                Sign In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-sm transition-colors focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                    placeholder="At least 12 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:text-flame-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-sm transition-colors focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                Must be at least 12 characters long and distinct from previous passwords.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Saving new password…</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
