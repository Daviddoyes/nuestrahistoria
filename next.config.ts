import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La importación CSV del panel manda el fichero entero a una Server Action,
      // y el límite por defecto es 1 MB. El fichero se corta en 3 MB
      // (MAX_BYTES_CSV en src/lib/importar-csv.ts); el resto es el envoltorio
      // del formulario. Por encima de 4,5 MB lo rechazaría Vercel igualmente.
      bodySizeLimit: "4mb",
    },
  },
  async redirects() {
    return [
      // "Mis gooals" se fundió en el perfil. Quien tenga la dirección guardada, o
      // la app instalada con la barra antigua, no debe caer en un 404.
      // Temporal (307) y no permanente: si algún día la ruta vuelve a usarse,
      // los navegadores no tendrán la redirección grabada para siempre.
      { source: "/mis-gooals", destination: "/perfil", permanent: false },
    ];
  },
};

export default nextConfig;
