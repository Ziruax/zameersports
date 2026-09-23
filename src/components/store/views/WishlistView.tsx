"use client";

import { useEffect, useMemo } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/hooks/use-wishlist";
import { api } from "@/lib/api";
import type { ProductsResponse } from "@/lib/types";
import ProductCard from "../ProductCard";

/** All products across every page (the public API caps page size, so page 1
 *  reports the total page count and the remaining pages are fetched in
 *  parallel, then merged). */
function useAllProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const first = await api<ProductsResponse>("/api/products?page=1&limit=24");
      if (first.pages <= 1) return first;
      const rest = await Promise.all(
        Array.from({ length: first.pages - 1 }, (_, i) =>
          api<ProductsResponse>(`/api/products?page=${i + 2}&limit=24`),
        ),
      );
      return {
        items: [...first.items, ...rest.flatMap((r) => r.items)],
        total: first.total,
        pages: first.pages,
      };
    },
    staleTime: 5 * 60_000,
  });
}

/** Saved-items view (#/wishlist): hearts collected from product cards. */
export default function WishlistView() {
  const { slugs } = useWishlist();
  const all = useAllProducts();

  useEffect(() => {
    document.title = "My Wishlist | Zameer Sports";
  }, []);

  const items = useMemo(() => {
    const source = all.data?.items ?? [];
    const set = new Set(slugs);
    return source.filter((p) => set.has(p.slug));
  }, [all.data, slugs]);

  const loading = all.isPending;

  return (
    <section className="container py-8 sm:py-12" aria-label="My wishlist">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-neutral-900">
            My Wishlist
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {slugs.length === 0
              ? "Save gear you like with the heart button and find it here."
              : `${slugs.length} saved item${slugs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {slugs.length > 0 ? (
          <Button asChild variant="outline" className="h-11 font-semibold">
            <a href="#/shop">Continue Shopping</a>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-5 px-6 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100">
              <Heart className="size-8 text-neutral-400" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="font-display text-xl font-bold uppercase tracking-wide text-neutral-900">
                Nothing saved yet
              </p>
              <p className="text-neutral-500">
                Tap the heart on any product to keep it here for later.
              </p>
            </div>
            <Button asChild className="h-11 px-8 font-semibold">
              <a href="#/shop">
                <ShoppingBag className="size-4" aria-hidden="true" />
                Browse the Shop
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
