import Image from "next/image";
import { Facebook, Instagram, MapPin, Music2, Phone, Youtube } from "lucide-react";
import type { CategoryDTO } from "@/lib/types";

interface FooterProps {
  categories: CategoryDTO[];
  settings: Record<string, string>;
}

const quickLinks = [
  { label: "Home", href: "#/" },
  { label: "Track Order", href: "#/track" },
  { label: "About Us", href: "#/about" },
  { label: "Contact", href: "#/contact" },
  { label: "Admin", href: "#/admin" },
];

/** Dark neutral footer with brand block, shop links, quick links and contact info. */
export default function Footer({ categories, settings }: FooterProps) {
  const year = new Date().getFullYear();
  const whatsapp = settings.whatsapp?.replace(/\D/g, "") || "";

  const socials = [
    { label: "Facebook", href: settings.facebook1, Icon: Facebook },
    { label: "Instagram", href: settings.instagram, Icon: Instagram },
    { label: "TikTok", href: settings.tiktok, Icon: Music2 },
    { label: "YouTube", href: settings.youtube, Icon: Youtube },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="mt-auto bg-neutral-900 text-neutral-300">
      <div className="container grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/brand/logo.png"
              alt="Zameer Sports logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
            />
            <p className="font-display text-xl font-bold uppercase tracking-wide text-white">
              Zameer <span className="text-amber-500">Sports</span>
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Dinga&apos;s complete sports centre and cricket specialists, serving Kharian, Gujrat
            and all of Pakistan with authentic gear, honest wholesale rates and fast delivery.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Zameer Sports on ${label}`}
                className="flex size-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition-colors hover:bg-emerald-700 hover:text-white"
              >
                <Icon className="size-5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <nav aria-label="Shop by category">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white">
            Shop
          </h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {categories.map((cat) => (
              <li key={cat.id}>
                <a
                  href={`#/shop?category=${cat.slug}`}
                  className="text-sm text-neutral-400 transition-colors hover:text-amber-500"
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick links */}
        <nav aria-label="Quick links">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white">
            Quick Links
          </h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-neutral-400 transition-colors hover:text-amber-500"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white">
            Contact
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-neutral-400">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>{settings.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <a href={`tel:${settings.phone}`} className="transition-colors hover:text-amber-500">
                {settings.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-amber-500"
                >
                  WhatsApp: +{whatsapp}
                </a>
              ) : null}
            </li>
            <li className="text-neutral-500">{settings.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-neutral-500 sm:flex-row">
          <p>
            © {year} Zameer Sports • ZameerSports.shop • Kolian Road, Dinga, Gujrat
          </p>
          <p>Cash on Delivery • Pakistan-wide Shipping</p>
        </div>
      </div>
    </footer>
  );
}
