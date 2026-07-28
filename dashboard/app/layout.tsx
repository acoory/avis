import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vehicle Control",
  description: "Gestion des contrôles, réparations et dossiers véhicules.",
  applicationName: "Vehicle Control",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vehicle Control",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/favicon/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#115e59",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  );
}
