import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Change Password',
  robots: { index: false, follow: false },
};

export default function AdminPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
