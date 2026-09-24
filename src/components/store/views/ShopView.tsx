"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/store/ProductCard";
import SectionHeading from "@/components/store/SectionHeading";
import { useCategories, useProducts } from "@/hooks/use-catalog";
import { usePathRoute } from "@/hooks/use-path-route";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/lib/types";

const PAGE_SIZE = 24;
const DEFAULT_SORT = "popular";

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
] as const;

const FILTER_KEYS = ["category", "search", "sort", "min", "max", "page"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function formatAmount(value: string): string {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n.toLocaleString("en-PK") : value;
}

function ShopCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl p-0 py-0">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-11 w-full" />
      </div>
    </Card>
  );
}

function PriceFilter({
  min,
  max,
  onApply,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}) {
  const [minInput, setMinInput] = useState(min);
  const [maxInput, setMaxInput] = useState(max);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        let lo = minInput.trim();
        let hi = maxInput.trim();
        if (lo && hi && Number.parseInt(lo, 10) > Number.parseInt(hi, 10)) {
          [lo, hi] = [hi, lo];
        }
        onApply(lo, hi);
      }}
    >
      <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase">
        Price Range (Rs)
      </h3>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Min"
          aria-label="Minimum price in rupees"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          className="h-11 bg-white"
        />
        <span className="text-neutral-400" aria-hidden="true">
          –
        </span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Max"
          aria-label="Maximum price in rupees"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="h-11 bg-white"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="h-11 w-full font-semibold hover:border-emerald-700 hover:text-emerald-800"
      >
        Apply Price Filter
      </Button>
    </form>
  );
}

interface FiltersPanelProps {
  categories: CategoryDTO[] | undefined;
  totalProducts: number | undefined;
  activeCategory: string;
  min: string;
  max: string;
  hasActiveFilters: boolean;
  onSelectCategory: (slug: string | null) => void;
  onApplyPrice: (min: string, max: string) => void;
  onClearAll: () => void;
}

function FiltersPanel({
  categories,
  totalProducts,
  activeCategory,
  min,
  max,
  hasActiveFilters,
  onSelectCategory,
  onApplyPrice,
  onClearAll,
}: FiltersPanelProps) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase">
          Categories
        </h3>
        <ul className="mt-3 flex flex-col gap-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              aria-pressed={activeCategory === ""}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold transition-colors",
                activeCategory === ""
                  ? "bg-emerald-700 text-white"
                  : "text-neutral-700 hover:bg-neutral-100",
              )}
            >
              <span>All Gear</span>
              {totalProducts !== undefined ? (
                <span
                  className={cn(
                    "text-xs font-bold",
                    activeCategory === "" ? "text-emerald-100" : "text-neutral-400",
                  )}
                >
                  {totalProducts}
                </span>
              ) : null}
            </button>
          </li>
          {categories?.map((c) => {
            const active = activeCategory === c.slug;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(c.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition-colors",
                    active
                      ? "bg-emerald-700 text-white"
                      : "text-neutral-700 hover:bg-neutral-100",
                  )}
                >
                  <span>{c.name}</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      active ? "text-emerald-100" : "text-neutral-400",
                    )}
                  >
                    {c.productCount}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <PriceFilter
        key={`${min}|${max}`}
        min={min}
        max={max}
        onApply={onApplyPrice}
      />

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm font-semibold text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );
}

export default function ShopView() {
  const { route, navigate } = usePathRoute();
  const query = route.query;

  const category = query.category ?? "";
  const search = query.search ?? "";
  const min = query.min ?? "";
  const max = query.max ?? "";
  const sort = query.sort ?? DEFAULT_SORT;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);

  const { data: categories } = useCategories();
  const activeCategory = categories?.find((c) => c.slug === category);
  const totalProducts = categories?.reduce((sum, c) => sum + c.productCount, 0);

  const { data, isPending } = useProducts({
    category: category || undefined,
    search: search || undefined,
    sort,
    min: min ? Number(min) : undefined,
    max: max ? Number(max) : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, data?.pages ?? 1);
  const outOfRangePage = data !== undefined && page > totalPages && (data.total ?? 0) > 0;

  /** Merge the current query with overrides (null / "" removes a param). */
  const shopUrl = (overrides: Partial<Record<FilterKey, string | number | null>>) => {
    const merged: Record<FilterKey, string | number | null> = {
      category: category || null,
      search: search || null,
      sort: sort === DEFAULT_SORT ? null : sort,
      min: min || null,
      max: max || null,
      page,
      ...overrides,
    };
    const sp = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = merged[key];
      if (value === null || value === undefined || value === "") continue;
      if (key === "page" && Number(value) <= 1) continue;
      sp.set(key, String(value));
    }
    const qs = sp.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const selectCategory = (slug: string | null) =>
    navigate(shopUrl({ category: slug, page: 1 }));
  const applyPrice = (lo: string, hi: string) =>
    navigate(shopUrl({ min: lo || null, max: hi || null, page: 1 }));
  const changeSort = (value: string) =>
    navigate(shopUrl({ sort: value === DEFAULT_SORT ? null : value, page: 1 }));
  const goToPage = (p: number) => navigate(shopUrl({ page: p }));
  const clearAll = () => navigate("/shop");

  const chips: { key: FilterKey; label: string }[] = [];
  if (category) {
    chips.push({ key: "category", label: activeCategory?.name ?? category });
  }
  if (search) {
    chips.push({ key: "search", label: `"${search}"` });
  }
  if (min || max) {
    if (min && max) chips.push({ key: "min", label: `Rs ${formatAmount(min)} – ${formatAmount(max)}` });
    else if (min) chips.push({ key: "min", label: `Rs ${formatAmount(min)}+` });
    else chips.push({ key: "max", label: `Under Rs ${formatAmount(max)}` });
  }
  const hasActiveFilters = chips.length > 0;

  const removeChip = (key: FilterKey) => {
    if (key === "min") navigate(shopUrl({ min: null, max: null, page: 1 }));
    else navigate(shopUrl({ [key]: null, page: 1 }));
  };

  const categoryLabel = activeCategory?.name ?? category.replace(/-/g, " ");
  const headingTitle = search
    ? `Search: "${search}"`
    : category
      ? `Shop ${categoryLabel} Gear`
      : "Shop All Sports Gear";

  const docTitle = search
    ? `Search: ${search}`
    : category
      ? `Shop ${categoryLabel} Gear`
      : "Shop All Gear";

  useEffect(() => {
    document.title = `${docTitle} | Zameer Sports`;
  }, [docTitle]);

  // Scroll back to top when the shopper changes page (skip initial mount).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [page]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtersPanel = (onClose: () => void) => (
    <FiltersPanel
      categories={categories}
      totalProducts={totalProducts}
      activeCategory={category}
      min={min}
      max={max}
      hasActiveFilters={hasActiveFilters}
      onSelectCategory={(slug) => {
        onClose();
        selectCategory(slug);
      }}
      onApplyPrice={(lo, hi) => {
        onClose();
        applyPrice(lo, hi);
      }}
      onClearAll={() => {
        onClose();
        clearAll();
      }}
    />
  );

  const pages = useMemo(() => {
    const list: number[] = [];
    for (let p = 1; p <= totalPages; p++) list.push(p);
    return list;
  }, [totalPages]);

  return (
    <section className="container py-8 lg:py-12" aria-label="Shop">
      <SectionHeading
        eyebrow="Catalog"
        title={headingTitle}
        action={
          <p className="text-sm font-medium text-neutral-500">
            {isPending
              ? "Loading products..."
              : `${data?.total ?? 0} product${data?.total === 1 ? "" : "s"}`}
          </p>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-10">
        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block" aria-label="Product filters">
          <Card className="top-28 p-5 lg:sticky">{filtersPanel(() => undefined)}</Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="hidden text-sm font-medium text-neutral-600 sm:block" id="shop-sort-label">
                  Sort by
                </span>
                <Select value={sort} onValueChange={changeSort}>
                  <SelectTrigger
                    aria-labelledby="shop-sort-label"
                    className="h-11 w-48 bg-white font-medium"
                  >
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile filters */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 font-semibold lg:hidden"
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    Filters
                    {hasActiveFilters ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                        {chips.length}
                      </span>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[85%] gap-0 overflow-y-auto p-0 sm:max-w-xs"
                >
                  <SheetHeader className="border-b p-4">
                    <SheetTitle className="font-display text-lg font-bold tracking-wide uppercase">
                      Filters
                    </SheetTitle>
                    <SheetDescription>
                      Narrow down products by category and price range.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4">{filtersPanel(() => setFiltersOpen(false))}</div>
                </SheetContent>
              </Sheet>

              {/* Active filter chips */}
              {chips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 lg:ml-2">
                  {chips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 py-1 pr-1 pl-3 text-xs font-semibold text-neutral-700"
                    >
                      {chip.label}
                      <button
                        type="button"
                        onClick={() => removeChip(chip.key)}
                        aria-label={`Remove ${chip.label} filter`}
                        className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearAll}
                    className="h-8 px-2 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Grid */}
          {isPending ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ShopCardSkeleton key={i} />
              ))}
            </div>
          ) : outOfRangePage ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <SearchX className="size-12 text-neutral-300" aria-hidden="true" />
              <p className="text-lg font-semibold text-neutral-900">Page {page} not found</p>
              <p className="text-sm text-neutral-500">
                Only {totalPages} page{totalPages === 1 ? "" : "s"} of products match these
                filters.
              </p>
              <Button
                type="button"
                onClick={() => goToPage(1)}
                className="mt-1 h-11 bg-emerald-700 px-6 font-semibold text-white hover:bg-emerald-800"
              >
                Go to Page 1
              </Button>
            </div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <SearchX className="size-12 text-neutral-300" aria-hidden="true" />
              <p className="text-lg font-semibold text-neutral-900">No products found</p>
              <p className="text-sm text-neutral-500">Try different filters or search.</p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  onClick={clearAll}
                  className="mt-1 h-11 bg-emerald-700 px-6 font-semibold text-white hover:bg-emerald-800"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button asChild variant="outline" className="mt-1 h-11 px-6 font-semibold">
                  <a href="/">Back to Home</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {data?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && !outOfRangePage ? (
            <div className="mt-2 flex flex-col items-center gap-3">
              {totalPages > 1 ? (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11 p-0"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  {pages.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={p === page ? "default" : "outline"}
                      className={cn(
                        "size-11 p-0 font-semibold",
                        p === page && "bg-emerald-700 text-white hover:bg-emerald-800",
                      )}
                      aria-current={p === page ? "page" : undefined}
                      aria-label={`Page ${p}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11 p-0"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </nav>
              ) : null}
              <p className="text-sm text-neutral-500">
                Page {page} of {totalPages} &bull; {data.total} product
                {data.total === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
