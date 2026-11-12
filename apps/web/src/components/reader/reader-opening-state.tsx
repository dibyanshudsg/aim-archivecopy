'use client';

import { Flame } from '@/components/home/flame';

export function ReaderOpeningState() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffaf1] to-gray-100 p-6"
      role="status"
      aria-live="polite"
      aria-label="Opening magazine"
    >
      <div className="flex min-w-[260px] flex-col items-center text-center">
        <Flame className="origin-bottom scale-75 sm:scale-[0.82]" />
        <p className="mt-3 font-heading text-base font-semibold text-gray-700">
          Opening magazine
        </p>
      </div>
    </main>
  );
}
