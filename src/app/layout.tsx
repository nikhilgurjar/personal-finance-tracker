import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './theme';
import { AuthProvider } from '@/components/AuthProvider';
import { QueryProvider } from '@/components/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Finance Tracker',
  description: 'Track your income, expenses, savings, and financial goals',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finance Tracker',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
