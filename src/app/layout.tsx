import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import InstallBanner from "@/components/InstallBanner";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

// Solo para cifras y titulares de marca (clase .fuente-titular en globals.css).
// Poppins no es variable, así que se piden únicamente los pesos que se usan. El
// 600 está porque varios titulares son semibold: sin él, el navegador los
// engordaba a 700.
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['600', '700', '800'],
});

export const viewport: Viewport = {
  themeColor: '#00D1A7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "gooals",
  description: "Convierte tus intenciones en recuerdos.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'gooals',
  },
  // Sin `icons`: favicon.ico, icon.svg y apple-icon.png viven en src/app/ y
  // Next pone las etiquetas solo. Se generan con scripts/generar-iconos.mjs.
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
      </head>
      <body className={`${inter.variable} ${poppins.variable} min-h-full antialiased`}>
        <SplashScreen />
        {children}
        <InstallBanner />
      </body>
    </html>
  );
}
