'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ClearBookmarksModalProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearBookmarksModal({
  open,
  count,
  onConfirm,
  onCancel,
}: ClearBookmarksModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop (no heavy backdrop-blur to ensure zero lag) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50"
          />

          {/* Dialog Card (crisp, hardware-accelerated, zero lag) */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-bookmarks-title"
            aria-describedby="clear-bookmarks-description"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white p-6 shadow-2xl"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-200">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="clear-bookmarks-title" className="font-heading text-lg font-bold text-gray-900">
                  Clear Saved Issues?
                </h2>
                <p id="clear-bookmarks-description" className="mt-2 text-sm leading-relaxed text-gray-600">
                  You are about to remove all <strong className="text-gray-900">{count}</strong> saved issue{count !== 1 ? 's' : ''} from your browser. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={onCancel}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                Keep Saved Issues
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All Saved Issues</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
