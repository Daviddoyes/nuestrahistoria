import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Bebas_Neue } from "next/font/google";
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

// Solo para el sello que se comparte en historias: mayúsculas estrechas, de
// dorsal de carrera. No se usa en ninguna pantalla.
//
// Va por next/font y no por el CDN de Google: así se sirve desde nuestro propio
// dominio. OJO al dibujarla en un canvas: next/font le pone un nombre interno
// generado, NO "Bebas Neue", así que hay que leerlo de la variable CSS y
// esperar a document.fonts.load. Si no, el canvas dibuja con la letra del
// sistema y no da ningún error.
const bebas = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-bebas',
  weight: ['400'],
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
      <body className={`${inter.variable} ${poppins.variable} ${bebas.variable} min-h-full antialiased`}>
        <SplashScreen />
        {children}
        <InstallBanner />
      </body>
    </html>
  );
}
