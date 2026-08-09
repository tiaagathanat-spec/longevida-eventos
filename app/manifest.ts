import { MetadataRoute } from "next";

// Configuração do PWA instalável.
// Ícones e cores finais serão ajustados na fase de implementação visual.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Longevida Eventos",
    short_name: "Longevida",
    description: "Sistema de gestão de eventos esportivos",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#00A6D6",
    icons: [
      // { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      // { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
