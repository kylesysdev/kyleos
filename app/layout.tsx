import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KyleOS 2.0",
  description: "Knowledge Yielding Lifelike Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
