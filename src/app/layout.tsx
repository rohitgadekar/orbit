import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import { Outfit, Playfair_Display, Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orbit — Luxury Music Player",
  description: "A luxury studio music listening experience for your catalog.",
  applicationName: "Orbit",
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#181719",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${playfair.variable} ${syne.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="h-full min-h-dvh bg-[#f7f6f3] md:bg-[#18171a] font-sans text-ink selection:bg-[#dbe878]/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
