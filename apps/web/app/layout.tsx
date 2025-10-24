import { Inter } from 'next/font/google';

import { NotificationBell } from '@/components/notifications/bell';

import type { Metadata } from 'next';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChoreRights MVP',
  description: 'Blockchain-backed choreography rights management platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'ChoreRights',
    description: 'Register, license, and verify choreography rights on Polygon',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-50">
      <body className={`${inter.className} text-slate-900 antialiased`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white font-semibold">
                CR
              </span>
              <div>
                <p className="font-semibold">ChoreRights</p>
                <p className="text-xs text-slate-500">MVP PoC Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-6 text-sm text-slate-600" aria-label="Primary">
                <a className="hover:text-brand" href="/" data-testid="nav-home-link">
                  Home
                </a>
                <a
                  className="hover:text-brand"
                  href="/dashboard/new"
                  data-testid="nav-dashboard-link"
                >
                  Creator Dashboard
                </a>
                <a className="hover:text-brand" href="/admin/kpi" data-testid="nav-admin-link">
                  Admin KPI
                </a>
              </nav>
              <NotificationBell />
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} ChoreRights, Inc. All rights reserved.</span>
            <span>Polygon | Supabase | AWS Rekognition</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
