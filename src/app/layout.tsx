import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zameersports.shop";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zameer Sports | Complete Sports Centre — Cricket Specialists in Dinga, Gujrat",
    template: "%s | Zameer Sports",
  },
  description:
    "Zameer Sports Dinga — cricket bats, football, volleyball, badminton, trophies, gifts, toys and gym gear. Cricket specialists serving Kharian, Gujrat and all of Pakistan with Pakistan-wide delivery and Cash on Delivery.",
  keywords: [
    "cricket bat Pakistan",
    "sports shop Dinga",
    "Zameer Sports Dinga",
    "cricket store Gujrat",
    "buy cricket bat online Pakistan",
    "football volleyball badminton trophies gym",
  ],
  openGraph: {
    title: "Zameer Sports | Complete Sports Centre — Cricket Specialists in Dinga, Gujrat",
    description:
      "Cricket bats, football, volleyball, badminton, trophies, gifts, toys & gym gear. Pakistan-wide delivery and Cash on Delivery from Dinga, Gujrat.",
    type: "website",
    siteName: "Zameer Sports",
    locale: "en_PK",
    images: [
      {
        url: "/images/brand/hero-1.jpg",
        width: 1200,
        height: 630,
        alt: "Zameer Sports — Dinga's complete sports centre",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/images/brand/logo.png",
    apple: "/images/brand/logo.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportingGoodsStore",
  name: "Zameer Sports",
  url: siteUrl,
  telephone: "+92 310 7220870",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Board Chowk, Aslah Market, Kolian Road",
    addressLocality: "Dinga",
    addressRegion: "Kharian, Gujrat, Punjab",
    addressCountry: "PK",
  },
  priceRange: "$$",
  sameAs: [
    "https://www.facebook.com/zameersports49",
    "https://www.facebook.com/ZameerSports",
    "https://www.tiktok.com/@zameersports",
    "https://www.instagram.com/zameer.sports",
    "https://www.youtube.com/@zameersportsofficial804",
  ],
  openingHours: "Mo-Su 09:00-22:00",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 32.6405,
    longitude: 73.6945,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${oswald.variable} min-h-screen flex flex-col bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
