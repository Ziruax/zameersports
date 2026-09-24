"use client";

import Image from "next/image";
import { Heart, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCartStore } from "@/lib/cart-store";
import { discountPercent, formatPrice } from "@/lib/format";
import { useWishlist } from "@/hooks/use-wishlist";
import type { ProductListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import RatingStars from "./RatingStars";

function badgeClasses(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes("sale") || b.includes("hot") || b.includes("deal")) {
    return "bg-red-600 text-white";
  }
  if (b.includes("best")) {
    return "bg-emerald-700 text-white";
  }
  if (b) {
    return "bg-amber-500 text-amber-950";
  }
  return "";
}

export default function ProductCard({ product }: { product: ProductListItem }) {
  const add = useCartStore((s) => s.add);
  const { has, toggle } = useWishlist();
  const wishlisted = has(product.slug);
  const outOfStock = product.stock <= 0;
  const discount = discountPercent(product.price, product.comparePrice);

  const handleAdd = () => {
    if (outOfStock) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
    });
    toast.success("Added to cart");
  };

  return (
    <Card className="group relative gap-0 overflow-hidden rounded-xl p-0 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-100 text-neutral-300"
            aria-hidden="true"
          >
            <Package className="size-12" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              Photo coming soon
            </span>
          </div>
        )}
        {product.badge ? (
          <span
            className={cn(
              "absolute top-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              badgeClasses(product.badge),
            )}
          >
            {product.badge}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              wishlisted ? "fill-red-600 text-red-600" : "text-neutral-500",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {product.brand}
        </p>
        <a
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-relaxed text-neutral-900 hover:text-emerald-700"
        >
          {product.name}
        </a>
        <RatingStars rating={product.rating} count={product.reviewCount} />
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-neutral-900">{formatPrice(product.price)}</span>
          {product.comparePrice && product.comparePrice > product.price ? (
            <>
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                -{discount}%
              </span>
            </>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label={`Add ${product.name} to cart`}
          className="mt-1 h-11 w-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
        >
          <ShoppingCart className="size-4" aria-hidden="true" />
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>
      </div>
    </Card>
  );
}
