"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  Clock,
  ExternalLink,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Tags,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SectionHeading from "../SectionHeading";
import { useSettings, waLink } from "@/hooks/use-checkout";

/* ---------------------------------------------------------------- stats */

const STATS: { value: string; label: string }[] = [
  { value: "9,400+", label: "Facebook Followers" },
  { value: "7,300+", label: "TikTok Followers" },
  { value: "239K+", label: "TikTok Likes" },
  { value: "100%", label: "Pakistan-wide Delivery" },
];

/* --------------------------------------------------------------- values */

const VALUES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: Trophy,
    title: "Cricket First",
    text: "Cricket is our specialty — specialist bat knowledge, honest grades and proper knocking service before your bat ever leaves the shop.",
  },
  {
    Icon: Store,
    title: "One-Stop Centre",
    text: "Every sport under one roof — cricket, football, volleyball, badminton, gym gear, trophies, gifts and toys. One trip, everything sorted.",
  },
  {
    Icon: Tags,
    title: "Honest Wholesale Pricing",
    text: "Direct-importer rates on bats, balls and club orders — the same fair prices we give our local teams and schools.",
  },
  {
    Icon: HeartHandshake,
    title: "Community Commitment",
    text: "We sponsor tournaments, kit out school and club teams, and run the Zameer Sports Legends Cricket League — now in Season 5.",
  },
];

/* ----------------------------------------------------------------- view */

export default function AboutView() {
  const settings = useSettings();

  useEffect(() => {
    document.title = "About Us | Zameer Sports";
  }, []);

  const waHref = waLink(settings.whatsapp, "Assalam-o-Alaikum! I have a question about Zameer Sports");
  const telHref = `tel:${settings.phone.replace(/[^0-9+]/g, "")}`;
  const mapsHref = "https://www.google.com/maps/search/?api=1&query=Zameer+Sports+Dinga";

  return (
    <section className="container py-8 sm:py-12" aria-label="About Zameer Sports">
      {/* hero */}
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Our Story</p>
          <h1 className="font-display mt-2 text-3xl font-bold uppercase tracking-wide text-neutral-900 sm:text-4xl lg:text-5xl">
            The House of Sports in Dinga
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-neutral-600">
            Zameer Sports is a complete sports centre on Kolian Road, in Aslah Market at Board
            Chowk, Dinga — cricket specialists serving Kharian, Gujrat and every corner of
            Pakistan. From the bat that fits your grip to the trophy for your tournament final, we
            stock it, we know it, and we stand behind it.
          </p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg">
          <Image
            src="/images/brand/about.png"
            alt="Inside Zameer Sports store, Dinga"
            fill
            sizes="(max-width:1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* stats band */}
      <div className="mt-12 grid grid-cols-2 gap-6 rounded-3xl bg-emerald-950 px-6 py-10 text-center text-white sm:grid-cols-4 sm:py-12">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-display text-3xl font-bold text-amber-400 sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-100">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* story */}
      <div className="mt-12">
        <SectionHeading eyebrow="Who we are" title="More Than a Shop" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 leading-relaxed text-neutral-600">
            <p>
              We grew up with tape-ball cricket in the streets of Dinga — and that love turned into
              a full sports centre. Today we hand-pick Grade 1 English willow bats and ship them
              across the country. This is the home of the{" "}
              <strong className="text-neutral-900">Zameer Legend 2026</strong>, our own flagship
              bat, alongside trusted names like GA Qasim and Saki Power.
            </p>
            <p>
              But cricket is only the start. We keep a full range of footballs and official{" "}
              <strong className="text-neutral-900">Jagga volleyballs</strong> at wholesale rates,
              Yonex and Victor badminton gear, a gym corner, and a trophy counter with on-the-spot
              engraving — plus gifts and toys for every occasion.
            </p>
            <p>
              And we play as hard as we sell. The{" "}
              <strong className="text-neutral-900">Zameer Sports Legends Cricket League</strong> is
              now in Season 5 with the Champion Trophy 2026, we sponsor village volleyball
              tournaments across the district, kit out school and club teams — and even export team
              kits to customers in the UK.
            </p>
          </div>
          <Card className="self-start">
            <CardContent className="space-y-4 p-6">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-neutral-900">
                What we stand for
              </h3>
              <ul className="space-y-3">
                {[
                  "Genuine branded stock, honestly graded",
                  "Free Pakistan-wide delivery on qualifying orders",
                  "Cash on Delivery — pay when it arrives",
                  "Bat knocking, re-gripping and repair service",
                  "Wholesale rates for clubs, schools and tournaments",
                  "Trophy engraving and custom team kits",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-neutral-600">
                    <Users className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* values grid */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map(({ Icon, title, text }) => (
          <Card key={title} className="transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50">
                <Icon className="size-6 text-emerald-700" aria-hidden="true" />
              </span>
              <h3 className="font-display text-base font-bold uppercase tracking-wide text-neutral-900">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* visit us */}
      <Card className="mt-12 overflow-hidden">
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-neutral-900">
              Visit the Shop
            </h2>
            <div className="flex items-start gap-3 text-neutral-600">
              <MapPin className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>{settings.address}</p>
            </div>
            <div className="flex items-start gap-3 text-neutral-600">
              <Clock className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>{settings.hours}</p>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <a
                href={telHref}
                className="font-semibold text-neutral-900 underline-offset-4 hover:text-emerald-800 hover:underline"
              >
                {settings.phone}
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <Button asChild className="h-11 gap-2 font-semibold">
              <a href={waHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-5" aria-hidden="true" />
                WhatsApp Us
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11 gap-2 font-medium">
              <a href={mapsHref} target="_blank" rel="noreferrer">
                <MapPin className="size-5 text-emerald-700" aria-hidden="true" />
                Get Directions
                <ExternalLink className="size-4 text-neutral-400" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
