import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-heading text-4xl font-bold text-flame-900 sm:text-5xl">404</h1>
      <h2 className="mt-4 font-heading text-xl font-semibold text-gray-900 sm:text-2xl">Page Not Found</h2>
      <p className="mt-2 max-w-md text-sm text-gray-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-gold-600 hover:to-flame-600"
      >
        Return to Home
      </Link>
    </div>
  );
}
