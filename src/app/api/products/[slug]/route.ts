import { query } from "@/lib/db"
import type { ProductRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import type { ProductDetail } from "@/lib/types"
import { dbErrorResponse, parseImages, parseSpecs, parseTags, toListItem } from "../../_lib/helpers"

/** GET /api/products/[slug] — full active product + category name + related (same category, top sold, 4). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    /* Prisma include { category: { select: { name, slug } } } → LEFT JOIN, flat columns */
    const product = await withRetry(
      () =>
        query<ProductRow & { categoryName: string; categorySlug: string }>(
          "SELECT p.*, c.name AS categoryName, c.slug AS categorySlug FROM Product p LEFT JOIN Category c ON c.id = p.categoryId WHERE p.slug = ? AND p.active = 1 LIMIT 1",
          [slug],
        ).then((rows) => rows[0] ?? null),
      { label: "products:detail" },
    )
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    const relatedRows = await withRetry(
      () =>
        query<ProductRow>(
          "SELECT * FROM Product WHERE active = 1 AND categoryId = ? AND slug <> ? ORDER BY sold DESC LIMIT 4",
          [product.categoryId, slug],
        ),
      { label: "products:related" },
    )

    const detail: ProductDetail = {
      ...toListItem(product),
      sku: product.sku,
      description: product.description,
      images: parseImages(product.images),
      specs: parseSpecs(product.specs),
      tags: parseTags(product.tags),
      featured: product.featured,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      categoryName: product.categoryName,
      categorySlug: product.categorySlug,
      related: relatedRows.map(toListItem),
    }
    return Response.json(detail)
  } catch (err) {
    return dbErrorResponse(err, "products:detail")
  }
}
