import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klecto — Keep what matters",
  description: "A social home for the things you collect and the people who understand why.",
  metadataBase: new URL("https://klecto.app"),
  openGraph: {
    title: "Klecto — Keep what matters",
    description: "Show your collections, find your people, and keep every story attached.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f5ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
