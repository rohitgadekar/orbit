import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Velar — Hi-Res 24-Bit FLAC Music Sanctuary",
  description: "Experience bit-perfect 24-bit FLAC audio. Hear every detail at no cost. 100% ad-free, private, and invite only.",
  appleWebApp: {
    capable: true,
    title: "Velar",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/orbit-32.png", sizes: "32x32", type: "image/png" },
      { url: "/orbit-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#080808",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="h-full min-h-dvh bg-[#18171a] font-sans text-ink selection:bg-blue-500/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
