'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send reset link. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset instructions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-amber-50/30 to-flame-50/20 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/admin/login"
          className="group mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-flame-700"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Sign In</span>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-amber-200/80 bg-white p-8 shadow-[0_12px_40px_rgba(120,84,28,0.08)] sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-100 to-flame-100 shadow-xs">
              <Image src="/logo.png" alt="Sri Aurobindo" width={32} height={32} className="object-contain" />
            </div>
            <h1 className="font-heading text-xl font-bold text-gray-900 sm:text-2xl">
              Forgot Password
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-gray-500 sm:text-sm">
              Enter your administrator email to receive a password reset link
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-gray-900">
                  Check your inbox
                </h2>
                <p className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                  If an active administrator account exists for <span className="font-semibold text-gray-900">{email}</span>, we have sent instructions to reset your password.
                </p>
                <p className="text-xs text-gray-500">
                  Please check your spam or junk folder if you don&apos;t see it within a couple of minutes.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="text-xs font-semibold text-flame-700 underline underline-offset-4 hover:text-flame-900"
                >
                  Try another email address
                </button>
              </div>

              <Link
                href="/admin/login"
                className="flex w-full items-center justify-center rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Administrator Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm transition-colors focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                    placeholder="admin@example.org"
                  />
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Sending reset link…</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
