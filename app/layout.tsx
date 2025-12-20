import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KyleOS",
  description: "Knowledge Yielding Lifelike Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="scanline"></div>
        {children}
      </body>
    </html>
  );
}