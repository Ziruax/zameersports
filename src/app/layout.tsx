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
    default: "Zameer Sports | Complete Sports Centre & Cricket Shop in Dinga, Gujrat",
    template: "%s | Zameer Sports",
  },
  description:
    "Zameer Sports Dinga is a trusted cricket shop in Pakistan. Buy original cricket bats, footballs, volleyballs, badminton rackets, trophies, gifts, toys and gym gear online with Cash on Delivery and Pakistan-wide delivery from Dinga, Gujrat.",
  keywords: [
    "cricket bat Pakistan",
    "sports shop Dinga",
    "Zameer Sports Dinga",
    "cricket store Gujrat",
    "buy cricket bat online Pakistan",
    "cricket bat price in Pakistan",
    "sports shop Kharian",
    "football volleyball badminton trophies gym",
    "ZameerSports.shop",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Zameer Sports | Complete Sports Centre & Cricket Shop in Dinga, Gujrat",
    description:
      "Original cricket bats, footballs, volleyballs, badminton rackets, trophies, gifts, toys and gym gear. Pakistan-wide delivery and Cash on Delivery from Dinga, Gujrat.",
    type: "website",
    siteName: "Zameer Sports",
    locale: "en_PK",
    url: siteUrl,
    images: [
      {
        url: "/images/brand/hero-1.jpg",
        width: 1200,
        height: 630,
        alt: "Zameer Sports, Dinga's complete sports centre and cricket shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zameer Sports | Complete Sports Centre & Cricket Shop in Dinga",
    description:
      "Original cricket bats and sports gear with Pakistan-wide delivery and Cash on Delivery.",
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
  logo: `${siteUrl}/images/brand/logo.png`,
  image: `${siteUrl}/images/brand/hero-1.jpg`,
  telephone: "+92 310 7220870",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Board Chowk, Aslah Market, Kolian Road",
    addressLocality: "Dinga",
    addressRegion: "Kharian, Gujrat, Punjab",
    addressCountry: "PK",
  },
  priceRange: "Rs 200 - Rs 45,000",
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Zameer Sports",
  url: siteUrl,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${oswald.variable} min-h-screen flex flex-col bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
