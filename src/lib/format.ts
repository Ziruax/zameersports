/** Price / misc formatting helpers (PKR). */

const priceFormatter = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 })

/** Format an integer PKR amount, e.g. 12499 -> "Rs 12,499". */
export function formatPrice(value: number): string {
  return `Rs ${priceFormatter.format(Math.round(value))}`
}

/** Discount percentage between comparePrice and price (0 when none). */
export function discountPercent(price: number, comparePrice: number | null | undefined): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}
