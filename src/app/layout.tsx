import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import InstallBanner from "@/components/InstallBanner";

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "Livestory",
  description: "Convierte tus intenciones en recuerdos.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Livestory',
  },
  icons: {
    apple: [{ url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-startup-image" href="/apple-splash-screen.png" />
      </head>
      <body className={`${playfair.variable} ${inter.variable} min-h-full antialiased`}>
        <SplashScreen />
        {children}
        <InstallBanner />
      </body>
    </html>
  );
}
