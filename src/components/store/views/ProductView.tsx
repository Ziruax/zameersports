"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  MessageCircle,
  Minus,
  Package,
  PackageSearch,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import ProductCard from "@/components/store/ProductCard";
import RatingStars from "@/components/store/RatingStars";
import SectionHeading from "@/components/store/SectionHeading";
import { useProduct, useReviews, useSettings } from "@/hooks/use-catalog";
import { useCartStore } from "@/lib/cart-store";
import { api } from "@/lib/api";
import { discountPercent, formatDate, formatPrice, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULT_WHATSAPP = "923465002049";

function badgeClasses(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes("sale") || b.includes("hot") || b.includes("deal")) {
    return "bg-red-600 text-white";
  }
  if (b.includes("best")) return "bg-emerald-700 text-white";
  return "bg-amber-500 text-amber-950";
}

function ProductSkeleton() {
  return (
    <div className="container py-8 lg:py-12" aria-label="Loading product" aria-busy="true">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="mt-2 flex gap-3">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-28" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductView({ slug }: { slug: string }) {
  const { data: product, isPending, isError } = useProduct(slug);
  const { data: settings } = useSettings();
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (product) {
      document.title = product.metaTitle
        ? `${product.metaTitle} | Zameer Sports`
        : `${product.name} | Buy Online at Zameer Sports`;
    }
  }, [product]);

  /* Per-product meta description + OG tags. Uses the admin-editable
   * metaDescription when set, else the first 155 characters of the product
   * description. Restored to the site default on unmount. */
  useEffect(() => {
    if (!product) return;
    const description = (
      product.metaDescription || product.description
    ).replace(/\s+/g, " ").trim().slice(0, 155);
    const upsert = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute("content", description);
      return el;
    };
    const metaDesc = upsert('meta[name="description"]', { name: "description" });
    const ogDesc = upsert('meta[property="og:description"]', { property: "og:description" });
    return () => {
      metaDesc.setAttribute(
        "content",
        "Zameer Sports Dinga is a trusted cricket shop in Pakistan. Buy original cricket bats, footballs, volleyballs, badminton rackets, trophies, gifts, toys and gym gear online with Cash on Delivery.",
      );
      ogDesc.setAttribute(
        "content",
        "Original cricket bats, footballs, volleyballs, badminton rackets, trophies, gifts, toys and gym gear. Pakistan-wide delivery and Cash on Delivery from Dinga, Gujrat.",
      );
    };
  }, [product]);

  /* Product structured data (JSON-LD). Injected client-side because product
   * views are client-side routes (/product/<slug>) — the SPA shell is a
   * single server-rendered page, so the per-product schema is added to the
   * document head on demand. Removed on unmount / re-navigation so only one
   * product schema exists at a time. */
  useEffect(() => {
    if (!product) return;
    document.getElementById("product-jsonld")?.remove();
    const SITE_URL = "https://zameersports.shop";
    const image = product.images[0] ?? product.image;
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: image.startsWith("http") ? image : `${SITE_URL}${image}`,
      description: product.description.slice(0, 120),
      sku: product.sku,
      brand: { "@type": "Brand", name: product.brand },
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "PKR",
        availability:
          product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `${SITE_URL}/product/${product.slug}`,
      },
    };
    if (product.reviewCount > 0) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      };
    }
    const script = document.createElement("script");
    script.id = "product-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [product]);

  if (!slug || (!isPending && (isError || !product))) {
    return (
      <section
        className="container flex flex-col items-center justify-center gap-4 py-20 text-center lg:py-28"
        aria-label="Product not found"
      >
        <PackageSearch className="size-16 text-neutral-300" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold tracking-wide text-neutral-900 uppercase sm:text-3xl">
          Product not found
        </h1>
        <p className="max-w-md text-neutral-500">
          This product may be out of stock or the link is no longer valid.
        </p>
        <Button asChild className="mt-2 h-12 bg-emerald-700 px-8 text-base font-semibold text-white hover:bg-emerald-800">
          <a href="/shop">Back to Shop</a>
        </Button>
      </section>
    );
  }

  if (isPending || !product) {
    return <ProductSkeleton />;
  }

  const outOfStock = product.stock <= 0;
  const maxQty = Math.min(Math.max(product.stock, 1), 10);
  const discount = discountPercent(product.price, product.comparePrice);
  const summary = product.description
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ");

  const stockChip = outOfStock
    ? { label: "Out of Stock", cls: "bg-red-50 text-red-700" }
    : product.stock <= 5
      ? { label: `Only ${product.stock} left`, cls: "bg-amber-50 text-amber-700" }
      : { label: "In Stock", cls: "bg-emerald-50 text-emerald-700" };

  const whatsappNumber = settings?.whatsapp || DEFAULT_WHATSAPP;
  const whatsappText = encodeURIComponent(
    `Assalam-o-Alaikum! I want to order: ${product.name} (${formatPrice(product.price)}) from zameersports.shop`,
  );

  const handleAdd = () => {
    if (outOfStock) return;
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
      },
      qty,
    );
    toast.success("Added to cart");
  };

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/" className="hover:text-emerald-700">
                Home
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a
                href={`/shop?category=${encodeURIComponent(product.categorySlug)}`}
                className="hover:text-emerald-700"
              >
                {product.categoryName}
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[12rem] truncate sm:max-w-sm">
              {product.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <Card className="gap-0 overflow-hidden rounded-2xl p-2 py-2">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
            {product.images[selectedImage] ?? product.image ? (
              <Image
                src={product.images[selectedImage] ?? product.image}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-100 text-neutral-300"
                aria-hidden="true"
              >
                <Package className="size-16" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  Photo coming soon
                </span>
              </div>
            )}
            {product.badge ? (
              <span
                className={cn(
                  "absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase",
                  badgeClasses(product.badge),
                )}
              >
                {product.badge}
              </span>
            ) : null}
          </div>
          {product.images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-2 pt-3" role="group" aria-label="Product images">
              {product.images.map((image, i) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Show image ${i + 1} of ${product.images.length}`}
                  aria-pressed={selectedImage === i}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:size-20",
                    selectedImage === i
                      ? "border-emerald-700"
                      : "border-transparent hover:border-neutral-300",
                  )}
                >
                  <Image
                    src={image}
                    alt={`${product.name}, image ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
            {product.brand}
          </p>
          <h1 className="font-display text-2xl leading-tight font-bold tracking-wide text-neutral-900 uppercase sm:text-3xl">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
            <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
            <span aria-hidden="true">&middot;</span>
            <span>{product.sold}+ sold</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-neutral-900">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price ? (
              <>
                <span className="text-lg text-neutral-400 line-through">
                  {formatPrice(product.comparePrice)}
                </span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  -{discount}%
                </span>
              </>
            ) : null}
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                stockChip.cls,
              )}
            >
              {stockChip.label}
            </span>
          </div>

          {summary ? <p className="leading-relaxed text-neutral-700">{summary}</p> : null}

          {/* Quantity + actions */}
          <div className="mt-1 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span id="qty-label" className="text-sm font-medium text-neutral-700">
                Quantity
              </span>
              <div className="flex items-center gap-1" role="group" aria-labelledby="qty-label">
                <Button
                  type="button"
                  variant="outline"
                  className="size-11"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>
                <span className="w-10 text-center text-lg font-bold text-neutral-900" aria-live="polite">
                  {qty}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="size-11"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleAdd}
                disabled={outOfStock}
                className="h-12 flex-1 bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
              >
                <ShoppingCart className="size-5" aria-hidden="true" />
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button asChild variant="outline" className="h-12 flex-1 text-base font-semibold">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Order ${product.name} on WhatsApp`}
                >
                  <MessageCircle className="size-5 text-emerald-700" aria-hidden="true" />
                  Buy on WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {/* Trust row */}
          <ul className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <li className="flex items-center gap-2.5 rounded-lg border border-neutral-200 p-3">
              <Banknote className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-neutral-700">Cash on Delivery</span>
            </li>
            <li className="flex items-center gap-2.5 rounded-lg border border-neutral-200 p-3">
              <ShieldCheck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-neutral-700">
                7-Day Checking Warranty
              </span>
            </li>
            <li className="flex items-center gap-2.5 rounded-lg border border-neutral-200 p-3">
              <Truck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-neutral-700">Fast Delivery</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mt-10 lg:mt-14">
        <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-lg bg-neutral-100 p-1">
          <TabsTrigger
            value="description"
            className="h-10 flex-1 px-5 font-semibold sm:flex-none"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="specifications"
            className="h-10 flex-1 px-5 font-semibold sm:flex-none"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger value="reviews" className="h-10 flex-1 px-5 font-semibold sm:flex-none">
            Reviews ({product.reviewCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <p className="max-w-3xl leading-relaxed whitespace-pre-line text-neutral-700">
            {product.description}
          </p>
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          {Object.keys(product.specs).length > 0 ? (
            <dl className="max-w-3xl divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex flex-wrap justify-between gap-4 px-5 py-3.5">
                  <dt className="text-sm font-semibold text-neutral-900">{key}</dt>
                  <dd className="text-sm text-neutral-600 sm:text-right">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-neutral-500">No specifications listed for this product.</p>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <ReviewsList productId={product.id} />
            <ReviewForm productId={product.id} slug={slug} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Related */}
      {product.related.length > 0 ? (
        <section className="mt-12 lg:mt-16" aria-label="Related products">
          <SectionHeading eyebrow="Related" title="You May Also Like" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {product.related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ReviewsList({ productId }: { productId: string }) {
  const { data: reviews, isPending, isError } = useReviews(productId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading reviews" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-neutral-500">Could not load reviews right now.</p>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No reviews yet. Be the first one to review this product.
      </p>
    );
  }

  return (
    <ul className="scrollbar-slim max-h-96 divide-y divide-neutral-100 overflow-y-auto pr-2">
      {reviews.map((review) => (
        <li key={review.id} className="flex gap-3 py-4 first:pt-0">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
          >
            {initialsOf(review.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-neutral-900">{review.name}</p>
              <p className="text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
            </div>
            <div className="mt-0.5">
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{review.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: (data: { name: string; rating: number; comment: string }) =>
      api<{ ok: boolean }>("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ productId, ...data }),
      }),
    onSuccess: () => {
      toast.success("Review submitted, Shukriya!");
      setName("");
      setRating(0);
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      void queryClient.invalidateQueries({ queryKey: ["product", slug] });
    },
    onError: () => {
      toast.error("Could not submit, please try again");
    },
  });

  const canSubmit =
    !mutation.isPending && rating >= 1 && name.trim().length >= 2 && comment.trim().length >= 5;

  return (
    <Card className="h-fit p-5">
      <h3 className="font-display text-lg font-bold tracking-wide text-neutral-900 uppercase">
        Write a Review
      </h3>
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          mutation.mutate({ name: name.trim(), rating, comment: comment.trim() });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-name" className="text-sm font-medium text-neutral-700">
            Your name
          </label>
          <Input
            id="review-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ahmed Raza"
            maxLength={80}
            required
            className="h-11 bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Rating</span>
          <div className="flex items-center gap-1" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= (hoverRating || rating);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={rating === n}
                  className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100"
                >
                  <Star
                    className={cn(
                      "size-6 transition-colors",
                      active ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-300",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-comment" className="text-sm font-medium text-neutral-700">
            Your review
          </label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How is the product? Delivery experience?"
            rows={4}
            maxLength={2000}
            required
            className="bg-white"
          />
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
        >
          {mutation.isPending ? "Submitting..." : "Submit Review"}
        </Button>
      </form>
    </Card>
  );
}
