"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Banknote,
  Blocks,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Dumbbell,
  ExternalLink,
  Feather,
  Gift,
  Globe,
  Headphones,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  Trophy,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { initialsOf } from "@/lib/format";
import { useViewportWidth } from "@/hooks/use-viewport-width";
import type { StoreInitialData } from "@/lib/types";
import ProductCard from "../ProductCard";
import RatingStars from "../RatingStars";
import SectionHeading from "../SectionHeading";

/* ------------------------------------------------------------- hero slides */

// Hero imagery from src/data/catalog.json (brand.heroImages)
const HERO_SLIDES = [
  {
    image: "/images/brand/hero-1.jpg",
    headline: "Dinga's Complete Sports Centre",
    sub: "Cricket specialists serving players and teams all over Pakistan, from tape-ball to test cricket",
  },
  {
    image: "/images/brand/hero-2.jpg",
    headline: "Home of the Zameer Legend 2026",
    sub: "Grade 1 English willow bats, hand-picked for Pakistani pitches",
  },
  {
    image: "/images/brand/hero-3.jpg",
    headline: "Gear Up. Every Sport. Every Level.",
    sub: "Football, volleyball, badminton, trophies, gifts, toys and gym, all under one roof",
  },
];

const TRUST_ITEMS = [
  { Icon: BadgeCheck, label: "100% Authentic", text: "Genuine branded stock" },
  { Icon: Truck, label: "Pakistan-wide Delivery", text: "Fast & reliable shipping" },
  { Icon: Banknote, label: "Cash on Delivery", text: "Pay when it arrives" },
  { Icon: Headphones, label: "Expert Advice", text: "0346 5002049" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Zap,
  Globe,
  CircleDot,
  Feather,
  Trophy,
  Gift,
  Blocks,
  Dumbbell,
};

const WHY_CARDS = [
  {
    Icon: ShieldCheck,
    title: "Authentic Branded Stock",
    text: "Genuine brands and honest grades. Every bat, ball and racket is quality-checked at our Dinga shop before it ships.",
  },
  {
    Icon: Tag,
    title: "Honest Wholesale Rates",
    text: "Direct importer pricing on bats, volleyballs and club orders, the same fair rates we are giving to local teams since years.",
  },
  {
    Icon: Truck,
    title: "Fast Delivery + COD",
    text: "Pakistan-wide shipping with Cash on Delivery. Free delivery on orders above Rs 5,000.",
  },
  {
    Icon: Wrench,
    title: "After-Sale Service",
    text: "Bat knocking and re-gripping, stitch repairs and trophy engraving. We look after your gear properly.",
  },
];

const CRICKET_CHECKLIST = [
  "Grade 1 English willow bats",
  "Full kit outfits for clubs & schools",
  "Team & wholesale rates",
  "Bat knocking + grip service",
];

/* ------------------------------------------------------------- subcomponents */

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(timer);
  }, [paused, index]);

  const goTo = (i: number) =>
    setIndex(((i % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[index]!;

  return (
    <section
      aria-label="Featured collections"
      className="relative min-h-[420px] overflow-hidden bg-emerald-950 md:min-h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Crossfading background images */}
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Image
            src={slide.image}
            alt={slide.headline}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>
      {/* Emerald gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-950/60 to-transparent"
      />

      {/* Copy */}
      <div className="container relative flex min-h-[420px] items-center md:min-h-[520px]">
        <div className="max-w-xl py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white drop-shadow-md sm:text-4xl md:text-5xl">
                {slide.headline}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-100/90 sm:text-base">
                {slide.sub}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-12 bg-emerald-600 px-7 text-sm font-bold uppercase tracking-wide text-white hover:bg-emerald-500"
                >
                  <a href="#/shop?category=cricket">Shop Cricket</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-white/70 bg-transparent px-7 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#/shop">Browse All</a>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous slide"
        className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition-colors hover:bg-black/45 sm:flex"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next slide"
        className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition-colors hover:bg-black/45 sm:flex"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.image}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}: ${s.headline}`}
            aria-current={i === index}
            className={`h-2.5 rounded-full transition-all ${
              i === index ? "w-7 bg-amber-500" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function TestimonialsCarousel({
  testimonials,
  facebookUrl,
}: {
  testimonials: StoreInitialData["testimonials"];
  facebookUrl?: string;
}) {
  const [index, setIndex] = useState(0);
  const width = useViewportWidth();
  // Derived per view (SSR width 0 => mobile-first single card).
  const perView = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const maxIndex = Math.max(0, testimonials.length - perView);
  // Clamp during render instead of in an effect (no cascading setState).
  const activeIndex = Math.min(index, maxIndex);

  useEffect(() => {
    if (testimonials.length <= perView) return;
    const timer = setInterval(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), 6000);
    return () => clearInterval(timer);
  }, [maxIndex, perView, testimonials.length]);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(maxIndex, i)));

  return (
    <div className="relative">
      {/* Glow backdrop behind the cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative overflow-hidden" aria-live="polite">
        <div
          className="-mx-3 flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * (100 / perView)}%)` }}
        >
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className="basis-full px-3 sm:basis-1/2 lg:basis-1/3"
            >
              <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-colors duration-200 hover:border-amber-500/30 hover:bg-white/[0.09]">
                <div className="flex items-center justify-between">
                  <Quote className="-scale-x-100 text-amber-500/80" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-200/50">
                    Verified Buyer
                  </span>
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-emerald-50/90">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <span
                    aria-hidden="true"
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i % 2 === 0
                        ? "bg-amber-500 text-amber-950"
                        : "bg-emerald-400 text-emerald-950"
                    }`}
                  >
                    {initialsOf(t.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                    {t.location ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-100/60">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {t.location}
                      </p>
                    ) : null}
                  </div>
                  <span className="ml-auto shrink-0">
                    <RatingStars rating={t.rating} size="sm" />
                  </span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {maxIndex > 0 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous testimonials"
            disabled={activeIndex === 0}
            className="absolute top-1/2 -left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-emerald-900/80 text-white shadow-lg backdrop-blur transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-30 lg:flex lg:-left-5"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next testimonials"
            disabled={activeIndex === maxIndex}
            className="absolute top-1/2 -right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-emerald-900/80 text-white shadow-lg backdrop-blur transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-30 lg:flex lg:-right-5"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {/* Dots */}
      {maxIndex > 0 ? (
        <div className="mt-7 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show testimonials page ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? "w-7 bg-amber-500" : "w-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      toast.success("Subscribed! Welcome to the team.");
      setEmail("");
    } catch {
      toast.error("Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="Newsletter signup" className="container py-14">
      <div className="rounded-3xl bg-emerald-700 px-6 py-12 text-center sm:px-12 md:py-16">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
          Join Team Zameer
        </h2>
        <p className="mt-2 text-sm text-emerald-50/90 sm:text-base">
          Get deal alerts &amp; new arrivals
        </p>
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="h-12 flex-1 rounded-full border-emerald-500/40 bg-white/95 pl-5 text-neutral-900"
          />
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-full bg-amber-500 px-8 font-bold text-amber-950 hover:bg-amber-400"
          >
            {submitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-emerald-100/70">
          New bat drops, tournament deals and seasonal sales. No spam.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- FAQ */

const FAQS = [
  {
    q: "Do you deliver all over Pakistan?",
    a: "Yes, we deliver to every city and town of Pakistan. Orders above Rs 5,000 get free delivery and you can pay cash when the parcel reaches you.",
  },
  {
    q: "Are your cricket bats original?",
    a: "100% original. We stock genuine English willow and Kashmir willow bats from Pakistan's top makers, and every bat is checked by us in the shop before shipping.",
  },
  {
    q: "Do you give bat knocking and grip service?",
    a: "Yes, we do bat knocking, grip changing and small bat repairs in our Dinga shop. WhatsApp us and we will guide you properly.",
  },
  {
    q: "Can clubs and schools order in bulk?",
    a: "Definitely. We supply full kits to clubs, schools and tournaments on wholesale rates. Call or WhatsApp 0346 5002049 and we will make a package for you.",
  },
  {
    q: "How can I track my order?",
    a: "When your order is placed you get an order number. Enter it on the Track Order page with your phone number and see the live status.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

function FaqSection() {
  return (
    <section aria-label="Frequently asked questions" className="container py-14">
      <SectionHeading eyebrow="Good to Know" title="Questions People Ask Us" />
      <div className="mx-auto max-w-3xl divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {FAQS.map((f, i) => (
          <details key={f.q} className="group px-5 py-4 sm:px-6" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-neutral-900 marker:content-none sm:text-base">
              {f.q}
              <ChevronRight
                className="size-5 shrink-0 text-emerald-700 transition-transform duration-200 group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{f.a}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  );
}

/* ----------------------------------------------------------------- HomeView */

export default function HomeView({ initialData }: { initialData: StoreInitialData }) {
  const { categories, featured, testimonials, settings } = initialData;
  const featuredItems = featured.items;
  const whatsapp = settings.whatsapp?.replace(/\D/g, "") || "";
  const avgRating =
    testimonials.length > 0
      ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
      : 0;

  return (
    <div>
      <HeroCarousel />

      {/* Trust strip */}
      <section aria-label="Why shop with us" className="border-b border-neutral-100 bg-white">
        <div className="container grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {TRUST_ITEMS.map(({ Icon, label, text }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-900">{label}</p>
                <p className="text-xs text-neutral-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 ? (
        <section aria-label="Shop by category" className="container py-14">
          <SectionHeading title="Shop by Category" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] ?? Star;
              return (
                <a
                  key={cat.id}
                  href={`#/shop?category=${cat.slug}`}
                  className="group relative block overflow-hidden rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  aria-label={`Shop ${cat.name}`}
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-neutral-950/75 via-neutral-950/20 to-transparent"
                    />
                    <span className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-sm">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="absolute bottom-0 left-0 p-3">
                      <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                        {cat.name}
                      </p>
                      <p className="text-xs text-neutral-200">
                        {cat.productCount} product{cat.productCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Featured gear */}
      <section aria-label="Featured gear" className="bg-neutral-50 py-14">
        <div className="container">
          <SectionHeading
            eyebrow="Hand-picked"
            title="Featured Gear"
            action={
              <a
                href="#/shop"
                className="text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-800"
              >
                View all →
              </a>
            }
          />
          {featuredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <p className="font-semibold text-neutral-700">Our featured picks are being restocked</p>
              <p className="mt-1 text-sm text-neutral-500">
                Browse the full range in the shop while we update this shelf.
              </p>
              <Button asChild className="mt-5 h-11 bg-emerald-700 font-semibold text-white hover:bg-emerald-800">
                <a href="#/shop">Browse All Gear</a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Cricket Pro Zone */}
      <section aria-label="Cricket specialists" className="container py-14">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800">
          <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-2 lg:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
                Cricket Specialists
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
                From Tape Ball to Test Cricket
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-emerald-50/85">
                Cricket heritage runs deep at Zameer Sports. Our own Zameer Legend 2026 Grade-1
                English willow bat is hand-picked for Pakistani pitches, and we outfit clubs and
                schools with full kits at wholesale rates. We are also the proud sponsor of the
                Zameer Sports Legends Cricket League.
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {CRICKET_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-emerald-50">
                    <CheckCircle2 className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-12 bg-amber-500 px-7 text-sm font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-400"
                >
                  <a href="#/shop?category=cricket">
                    <ShoppingCart className="size-4" aria-hidden="true" />
                    Shop Cricket Now
                  </a>
                </Button>
                {whatsapp ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 border-white/60 bg-transparent px-7 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/10 hover:text-white"
                  >
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" aria-hidden="true" />
                      WhatsApp Us
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-4 border-amber-500/90 shadow-2xl">
              <Image
                src="/images/brand/hero-2.jpg"
                alt="Zameer Sports cricket bats and gear"
                fill
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Zameer Sports */}
      <section aria-label="Why Zameer Sports" className="bg-neutral-50 py-14">
        <div className="container">
          <SectionHeading eyebrow="Our Promise" title="Why Zameer Sports" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CARDS.map(({ Icon, title, text }) => (
              <Card
                key={title}
                className="rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-bold uppercase tracking-wide text-neutral-900">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 ? (
        <section
          aria-label="Customer testimonials"
          className="relative overflow-hidden bg-emerald-950 py-14"
        >
          {/* Decorative watermark quote */}
          <Quote
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -left-6 size-56 rotate-12 text-emerald-900/50"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)]"
          />
          <div className="container relative">
            <SectionHeading
              eyebrow="Testimonials"
              title="What Players Say"
              tone="dark"
              action={
                <div className="flex items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur">
                  <span
                    className="text-sm font-bold text-amber-400"
                    aria-label={`Average rating ${avgRating.toFixed(1)} out of 5 from ${testimonials.length} reviews`}
                  >
                    {avgRating.toFixed(1)}
                  </span>
                  <RatingStars rating={avgRating} size="sm" />
                  <span className="text-xs font-semibold text-amber-100/80">
                    {testimonials.length} reviews
                  </span>
                </div>
              }
            />
            <TestimonialsCarousel
              testimonials={testimonials}
              facebookUrl={settings.facebook2}
            />
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-xs text-emerald-100/60">
                Real reviews from players, clubs and schools of Gujrat district.
              </p>
              {settings.facebook2 ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-amber-500/40 bg-transparent font-semibold text-amber-100 hover:bg-amber-500/10 hover:text-white"
                >
                  <a href={settings.facebook2} target="_blank" rel="noreferrer">
                    Watch video reviews on Facebook
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <FaqSection />

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
}
