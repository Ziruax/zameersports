import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import type { ProductDetail } from "@/lib/types"
import { dbErrorResponse, parseImages, parseSpecs, parseTags, toListItem } from "../../_lib/helpers"

/** GET /api/products/[slug] — full active product + category name + related (same category, top sold, 4). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const product = await withRetry(
      () =>
        db.product.findFirst({
          where: { slug, active: true },
          include: { category: { select: { name: true, slug: true } } },
        }),
      { label: "products:detail" },
    )
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    const relatedRows = await withRetry(
      () =>
        db.product.findMany({
          where: { active: true, categoryId: product.categoryId, slug: { not: slug } },
          orderBy: { sold: "desc" },
          take: 4,
        }),
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
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      related: relatedRows.map(toListItem),
    }
    return Response.json(detail)
  } catch (err) {
    return dbErrorResponse(err, "products:detail")
  }
}
