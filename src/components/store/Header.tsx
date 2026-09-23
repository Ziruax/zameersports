"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Menu, Package, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cartCount, useCartStore } from "@/lib/cart-store";
import { useHashRoute } from "@/hooks/use-hash-route";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "#/", match: "home" },
  { label: "All Shop", href: "#/shop", match: "shop:" },
  { label: "Cricket", href: "#/shop?category=cricket", match: "shop:cricket" },
  { label: "Football", href: "#/shop?category=football", match: "shop:football" },
  { label: "Badminton", href: "#/shop?category=badminton", match: "shop:badminton" },
  { label: "Trophies", href: "#/shop?category=trophies", match: "shop:trophies" },
  { label: "Gym", href: "#/shop?category=gym", match: "shop:gym" },
  { label: "About", href: "#/about", match: "about" },
  { label: "Contact", href: "#/contact", match: "contact" },
];

function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  return (
    <form
      role="search"
      aria-label="Search products"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query.trim());
      }}
      className="relative w-full"
    >
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cricket bats, balls, gear..."
        aria-label="Search products"
        className="h-10 rounded-full border-neutral-300 bg-white pl-4 pr-11"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-700"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

export default function Header() {
  const { route } = useHashRoute();
  const items = useCartStore((s) => s.items);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = cartCount(items);

  const activeKey =
    route.name === "shop" ? `shop:${route.query.category ?? ""}` : route.name;

  const runSearch = (q: string) => {
    window.location.hash = q ? `#/shop?search=${encodeURIComponent(q)}` : "#/shop";
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      {/* Top row: brand / search / actions */}
      <div className="container flex items-center gap-3 py-3 sm:gap-6">
        <a href="#/" className="flex shrink-0 items-center gap-2.5" aria-label="Zameer Sports home">
          <Image
            src="/images/brand/logo.png"
            alt="Zameer Sports logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
            priority
          />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-xl font-bold uppercase tracking-wide text-neutral-900">
              Zameer <span className="text-amber-500">Sports</span>
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Dinga • Gujrat
            </span>
          </span>
        </a>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="w-full max-w-xl">
            <SearchBox onSearch={runSearch} />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <a
            href="#/track"
            aria-label="Track your order"
            className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-emerald-700 md:flex"
          >
            <Package className="size-4" aria-hidden="true" />
            Track Order
          </a>
          <a
            href="#/wishlist"
            aria-label="Open your wishlist"
            className="flex size-11 items-center justify-center rounded-full text-neutral-800 transition-colors hover:bg-neutral-100 hover:text-emerald-700"
          >
            <Heart className="size-5" aria-hidden="true" />
          </a>
          <Button
            type="button"
            variant="ghost"
            onClick={openDrawer}
            aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative size-11 rounded-full text-neutral-800 hover:bg-neutral-100"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute top-0.5 right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-amber-950">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Open navigation menu"
                className="size-11 rounded-full text-neutral-800 hover:bg-neutral-100 md:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] gap-0 overflow-y-auto p-0 sm:max-w-xs">
              <SheetHeader className="border-b p-4">
                <SheetTitle className="font-display text-lg font-bold uppercase tracking-wide">
                  Zameer <span className="text-amber-500">Sports</span>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Browse store categories, search products and track your order.
                </SheetDescription>
              </SheetHeader>
              <div className="border-b p-4">
                <SearchBox onSearch={runSearch} />
              </div>
              <nav aria-label="Mobile navigation" className="flex flex-col p-2">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={activeKey === link.match ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
                      activeKey === link.match
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-neutral-700 hover:bg-neutral-100",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#/track"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
                >
                  <Package className="size-4" aria-hidden="true" />
                  Track Order
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop nav row */}
      <nav aria-label="Main navigation" className="hidden border-t border-neutral-100 md:block">
        <div className="container flex items-center gap-1 overflow-x-auto py-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeKey === link.match ? "page" : undefined}
              className={cn(
                "relative flex h-10 shrink-0 items-center px-3 text-sm font-semibold transition-colors",
                activeKey === link.match
                  ? "text-emerald-700"
                  : "text-neutral-600 hover:text-emerald-700",
              )}
            >
              {link.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600 transition-opacity",
                  activeKey === link.match ? "opacity-100" : "opacity-0",
                )}
              />
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
