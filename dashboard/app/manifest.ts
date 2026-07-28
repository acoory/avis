import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Vehicle Control",
    short_name: "Vehicle Control",
    description: "Gestion des contrôles, réparations et dossiers véhicules.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#115e59",
    lang: "fr",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
