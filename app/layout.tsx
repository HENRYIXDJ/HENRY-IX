import type {Metadata} from 'next';
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const avathe = localFont({
  src: './fonts/avathe.otf',
  variable: '--font-avathe',
  adjustFontFallback: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Henry IX - DJ Portal',
  description: 'Interactive DJ portfolio for Henry IX',
};

import { AudioProvider } from '@/components/AudioProvider';
import ClientLayoutWrappers from '@/components/ClientLayoutWrappers';




export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${avathe.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preload" href="https://w.soundcloud.com/player/api.js" as="script" />
      </head>
      <body suppressHydrationWarning className="bg-black">
        <AudioProvider>
          <ClientLayoutWrappers />
          
          
          
          {children}
          <Analytics />
          <SpeedInsights />
        </AudioProvider>
      </body>
    </html>
  );
}
