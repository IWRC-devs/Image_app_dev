import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Html({ children }: PropsWithChildren) {
  const base = process.env.EXPO_PUBLIC_BASE_PATH || '';
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>IWRC Imaging</title>
        <meta name="description" content="Capture weed imaging batches and keep photos and field details on your device." />
        <meta name="theme-color" content="#28a745" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${base}/icons/icon-192.png`} />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        <script defer src={`${base}/register-sw.js`} />
      </body>
    </html>
  );
}
