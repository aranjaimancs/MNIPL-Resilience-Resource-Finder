import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F4032",
};

export const metadata: Metadata = {
  title: "Resilience Resources — Minnesota Interfaith Power & Light",
  description:
    "Find congregations and community sites near you that open their doors during environmental disruptions. Works offline — install and browse once to have hub locations available during power outages.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Resilience Resources",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <head>
        <meta name="theme-color" content="#1F4032" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
