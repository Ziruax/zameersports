import { query } from "@/lib/db";
import type { CategoryRow, ProductRow, TestimonialRow } from "@/lib/db-types";
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
      query<CategoryRow & { productCount: number }>(
        "SELECT c.*, (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) AS productCount FROM Category c ORDER BY c.sortOrder ASC",
      ),
    { attempts: 3, label: "home:categories" },
  );
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image,
    icon: c.icon,
    featured: c.featured,
    sortOrder: c.sortOrder,
    productCount: Number(c.productCount),
  }));
}

async function fetchFeatured(): Promise<ProductsResponse> {
  const rows = await withRetry(
    () => query<ProductRow>("SELECT * FROM Product WHERE featured = 1 AND active = 1 ORDER BY sold DESC LIMIT 8"),
    { attempts: 3, label: "home:featured" },
  );
  const items = rows.map(mapProduct);
  return { items, total: items.length, pages: 1 };
}

async function fetchTestimonials(): Promise<TestimonialDTO[]> {
  // NOTE: Testimonial model has no createdAt column, so no ordering applied.
  return withRetry(
    () => query<TestimonialRow>("SELECT * FROM Testimonial WHERE featured = 1"),
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
