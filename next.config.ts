import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
