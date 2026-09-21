/**
 * One-off fix: remove em dashes from live DB text content
 * (products, categories, testimonials, reviews, settings, order notes)
 * so it matches the cleaned catalog.json copy.
 *
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/fix-emdash.ts
 */
import { PrismaClient } from "@prisma/client";
import catalog from "../src/data/catalog.json";

const db = new PrismaClient({ log: ["error"] });

function deEmdash(s: string): string {
  return s.replace(/ — /g, ", ").replace(/—/g, "-");
}

async function main() {
  /* products: description straight from cleaned catalog, specs string-replaced */
  const catalogBySlug = new Map(catalog.products.map((p) => [p.slug, p]));
  const products = await db.product.findMany({ select: { id: true, slug: true, description: true, specs: true } });
  let n = 0;
  for (const p of products) {
    const c = catalogBySlug.get(p.slug);
    const newDescription = c ? c.description : deEmdash(p.description);
    const newSpecs = p.specs.includes("—") ? deEmdash(p.specs) : p.specs;
    if (newDescription !== p.description || newSpecs !== p.specs) {
      await db.product.update({ where: { id: p.id }, data: { description: newDescription, specs: newSpecs } });
      n++;
    }
  }
  console.log(`products updated: ${n}`);

  /* categories: description from cleaned catalog */
  const catBySlug = new Map(catalog.categories.map((c) => [c.slug, c]));
  const cats = await db.category.findMany({ select: { id: true, slug: true, description: true } });
  let m = 0;
  for (const cat of cats) {
    const c = catBySlug.get(cat.slug);
    const newDesc = c ? c.description : deEmdash(cat.description);
    if (newDesc !== cat.description) {
      await db.category.update({ where: { id: cat.id }, data: { description: newDesc } });
      m++;
    }
  }
  console.log(`categories updated: ${m}`);

  /* testimonials */
  const testimonials = await db.testimonial.findMany({ select: { id: true, text: true } });
  let t = 0;
  for (const x of testimonials) {
    if (x.text.includes("—")) {
      await db.testimonial.update({ where: { id: x.id }, data: { text: deEmdash(x.text) } });
      t++;
    }
  }
  console.log(`testimonials updated: ${t}`);

  /* reviews */
  const reviews = await db.review.findMany({ select: { id: true, comment: true } });
  let r = 0;
  for (const x of reviews) {
    if (x.comment.includes("—")) {
      await db.review.update({ where: { id: x.id }, data: { comment: deEmdash(x.comment) } });
      r++;
    }
  }
  console.log(`reviews updated: ${r}`);

  /* settings values */
  const settings = await db.setting.findMany({ select: { key: true, value: true } });
  let s = 0;
  for (const x of settings) {
    if (x.value.includes("—")) {
      await db.setting.update({ where: { key: x.key }, data: { value: deEmdash(x.value) } });
      s++;
    }
  }
  console.log(`settings updated: ${s}`);

  /* order notes */
  const orders = await db.order.findMany({ select: { id: true, notes: true } });
  let o = 0;
  for (const x of orders) {
    if (x.notes && x.notes.includes("—")) {
      await db.order.update({ where: { id: x.id }, data: { notes: deEmdash(x.notes) } });
      o++;
    }
  }
  console.log(`orders updated: ${o}`);

  /* verify */
  const leftovers =
    (await db.product.count({ where: { description: { contains: "—" } } })) +
    (await db.category.count({ where: { description: { contains: "—" } } })) +
    (await db.testimonial.count({ where: { text: { contains: "—" } } })) +
    (await db.review.count({ where: { comment: { contains: "—" } } })) +
    (await db.setting.count({ where: { value: { contains: "—" } } }));
  console.log(`leftover em-dash rows: ${leftovers}`);
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
