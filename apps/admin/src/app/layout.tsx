import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MYS Connect Admin',
  description: 'Admin Dashboard for Maheshwari Yuva Sangathan Connect',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full font-sans antialiased">
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
