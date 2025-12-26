import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "KyleOS 4.0",
  description: "Knowledge Yielding Lifelike Engine",
  manifest: "/manifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-kyle-green selection:text-black">
        {children}
      </body>
    </html>
  );
}
