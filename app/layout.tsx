import "./globals.css";

export const metadata = {
  title: "KyleOS 4.0",
  description: "The Ultimate AI OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: 'black' }}>
        {children}
      </body>
    </html>
  );
}
