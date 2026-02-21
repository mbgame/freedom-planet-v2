import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';

// Client-side only Leva controller
const ClientLeva = dynamic(() => import('@/components/ui/ClientLeva').then(mod => mod.ClientLeva), { ssr: false });

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'AetherOS - Planetary Systems Monitor',
  description: 'Interactive 3D planetary exploration and resource management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>
        <ClientLeva hidden={process.env.NEXT_PUBLIC_SHOW_CONTROLS !== 'true'} />
        {children}
      </body>
    </html>
  );
}
