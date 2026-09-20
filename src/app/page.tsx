import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";
import { getSettings } from "@/lib/settings";
import type {
  CategoryDTO,
  ProductListItem,
  ProductsResponse,
  StoreInitialData,
  TestimonialDTO,
} from "@/lib/types";
import StoreApp from "@/components/store/StoreApp";

export const dynamic = "force-dynamic";

type CategoryRow = Awaited<ReturnType<typeof db.category.findMany>>[number];
type ProductRow = Awaited<ReturnType<typeof db.product.findMany>>[number];

function firstImage(imagesJson: string): string {
  try {
    const parsed = JSON.parse(imagesJson);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
  } catch {
    // malformed images column — fall through to empty string
  }
  return "";
}

function mapProduct(p: ProductRow): ProductListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    comparePrice: p.comparePrice,
    image: firstImage(p.images),
    rating: p.rating,
    reviewCount: p.reviewCount,
    badge: p.badge,
    stock: p.stock,
    brand: p.brand,
    isNew: p.isNew,
    categoryId: p.categoryId,
    sold: p.sold,
  };
}

async function fetchCategories(): Promise<CategoryDTO[]> {
  const rows = await withRetry(
    () =>
      db.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      }),
    { attempts: 3, label: "home:categories" },
  );
  return rows.map((c: CategoryRow & { _count: { products: number } }) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image,
    icon: c.icon,
    featured: c.featured,
    sortOrder: c.sortOrder,
    productCount: c._count.products,
  }));
}

async function fetchFeatured(): Promise<ProductsResponse> {
  const rows = await withRetry(
    () =>
      db.product.findMany({
        where: { featured: true, active: true },
        orderBy: { sold: "desc" },
        take: 8,
      }),
    { attempts: 3, label: "home:featured" },
  );
  const items = rows.map(mapProduct);
  return { items, total: items.length, pages: 1 };
}

async function fetchTestimonials(): Promise<TestimonialDTO[]> {
  // NOTE: Testimonial model has no createdAt column — no ordering applied.
  return withRetry(
    () => db.testimonial.findMany({ where: { featured: true } }),
    { attempts: 3, label: "home:testimonials" },
  );
}

export default async function Page() {
  // Each query degrades independently — a flaky remote MySQL must never
  // take the whole homepage down (StoreApp renders a fallback hero).
  const [categories, featured, testimonials, settings] = await Promise.all([
    fetchCategories().catch(() => [] as CategoryDTO[]),
    fetchFeatured().catch(() => ({ items: [], total: 0, pages: 0 }) as ProductsResponse),
    fetchTestimonials().catch(() => [] as TestimonialDTO[]),
    getSettings(),
  ]);

  const initialData: StoreInitialData = {
    categories,
    featured,
    testimonials,
    settings,
  };

  return <StoreApp initialData={initialData} />;
}
