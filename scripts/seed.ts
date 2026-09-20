/**
 * Idempotent seed script for ZameerSports.shop (bun runtime, remote MySQL).
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/seed.ts
 *
 * Upserts by slug/email/key; skips rows that already exist (testimonials,
 * reviews, demo orders). Safe to re-run.
 */
import { PrismaClient } from "@prisma/client"
import { randomBytes, scryptSync } from "crypto"
import catalog from "../src/data/catalog.json"

const db = new PrismaClient({ log: ["error"] })

/* ------------------------------------------------------------------ helpers */

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

const MATERIALS: Record<string, string> = {
  cricket: "Selected willow, leather & premium composites",
  football: "Match-grade PU / synthetic leather",
  volleyball: "Machine-stitched synthetic leather",
  badminton: "Carbon graphite / lightweight alloy",
  trophies: "Metal alloy with premium gold finish",
  gifts: "Premium-finish gift materials",
  toys: "Child-safe durable materials",
  gym: "Steel, TPE & reinforced nylon",
}

const CRICKET_BAT_SLUGS = new Set([
  "zameer-legend-2026",
  "ga-qasim-english-willow",
  "saki-power-bat",
  "student-tennis-bat",
  "mb-malik-kashmir-willow",
])

function buildSpecs(p: (typeof catalog.products)[number]): Record<string, string> {
  const specs: Record<string, string> = { Brand: p.brand }
  if (CRICKET_BAT_SLUGS.has(p.slug)) {
    specs.Material = p.slug === "mb-malik-kashmir-willow" ? "Kashmir willow" : "English willow"
    specs.Guarantee = "Hand-checked at our Dinga shop — genuine product guarantee"
  } else {
    specs.Material = MATERIALS[p.categorySlug] ?? "Premium sports materials"
    specs.Guarantee = "Quality-checked before dispatch"
  }
  specs.Warranty = "7-day checking warranty"
  return specs
}

/* ------------------------------------------------------------- seed content */

const SETTINGS: Record<string, string> = {
  store_name: "Zameer Sports",
  store_tagline: "Dinga's Complete Sports Centre — Cricket Specialists",
  phone: "+92 310 7220870",
  whatsapp: "923465002049",
  email: "info@zameersports.shop",
  address: "Kolian Road, Aslah Market, Board Chowk, Dinga, Kharian, Gujrat",
  city: "Dinga",
  hours: "Open daily 9:00 AM – 10:00 PM",
  announcement: "FREE Pakistan-wide delivery on orders over Rs 5,000 • Cash on Delivery available",
  free_shipping_threshold: "5000",
  shipping_fee: "250",
  facebook1: "https://www.facebook.com/zameersports49",
  facebook2: "https://www.facebook.com/ZameerSports",
  tiktok: "https://www.tiktok.com/@zameersports",
  instagram: "https://www.instagram.com/zameer.sports",
  youtube: "https://www.youtube.com/@zameersportsofficial804",
  currency: "PKR",
}

const TESTIMONIALS = [
  // Real ones (from Google Maps / Facebook — hearts stripped)
  { name: "Matloob Chaudhary", location: "Dinga", text: "God sports shopping", rating: 5 },
  {
    name: "Mian Volleyball Club Chak Jani",
    location: "Chak Jani",
    text: "Thanks Brother, Welcome Too Zameer Sports Dinga",
    rating: 5,
  },
  // Realistic invented ones
  {
    name: "Ahmed Raza",
    location: "Kharian",
    text: "Best cricket bats in the area. I bought my Zameer Legend from here and the pickup is superb. Free delivery to Kharian in just one day.",
    rating: 5,
  },
  {
    name: "Fatima Noor",
    location: "Gujrat",
    text: "Genuine Yonex rackets at honest prices. My shuttlecocks arrived in Gujrat city within two days, nicely packed. Highly recommended for badminton players.",
    rating: 5,
  },
  {
    name: "Bilal Hussain",
    location: "Lala Musa",
    text: "We order match footballs for our club every season. Quality is consistent and cash on delivery makes everything easy.",
    rating: 4,
  },
  {
    name: "Usman Ghani",
    location: "Dinga",
    text: "They supplied the full sports kit for our school games — cricket gear, footballs and trophies. Very cooperative on pricing and delivery.",
    rating: 5,
  },
  {
    name: "Hamza Tariq",
    location: "Dinga",
    text: "Started gym recently — bought a skipping rope, resistance bands and gloves. Good quality and proper guidance for a beginner.",
    rating: 4,
  },
]

const REVIEW_POOL: Record<string, { name: string; rating: number; comment: string }[]> = {
  "zameer-legend-2026": [
    { name: "Ahmed Raza", rating: 5, comment: "Perfect grains and huge sweet spot. Worth every rupee." },
    { name: "Hassan Raza", rating: 5, comment: "Bat arrived pressed and ready to play. Free delivery to Kharian in one day." },
    { name: "Shahzaib Ali", rating: 4, comment: "Excellent pickup, slightly heavy for my taste but powerful." },
  ],
  "ga-qasim-english-willow": [
    { name: "Umar Farooq", rating: 5, comment: "Great English willow bat at this price. Playing league matches with it." },
    { name: "Zain Abbas", rating: 4, comment: "Good balance and finish. Shop checked it before dispatch." },
  ],
  "saki-power-bat": [
    { name: "Faizan Malik", rating: 5, comment: "Best tape-ball bat I have used. Big hits with tape ball." },
    { name: "Kamran Aslam", rating: 4, comment: "Strong bat, perfect for night tournaments." },
    { name: "Junaid Akram", rating: 5, comment: "Second one I bought from Zameer Sports. Consistent quality." },
  ],
  "leather-ball-match": [
    { name: "Adeel Shah", rating: 5, comment: "Proper match ball, holds shape and colour even after hard overs." },
    { name: "Rizwan Ali", rating: 4, comment: "Good stitch quality for club-level hard ball cricket." },
  ],
  "batting-pads-pro": [
    { name: "Sajid Mahmood", rating: 5, comment: "Lightweight and strong protection. Survived full season already." },
    { name: "Talha Munir", rating: 4, comment: "Fitting is comfortable, straps are holding well." },
  ],
  "gold-pro-360-shoes": [
    { name: "Naveed Iqbal", rating: 5, comment: "Grip on matting wickets is excellent. Very comfortable for long innings." },
    { name: "Ali Hassan", rating: 4, comment: "True to size, good breathing. Recommended for all-rounders." },
    { name: "Usman Khan", rating: 5, comment: "Original brand shoes at a fair price. COD made it easy." },
  ],
  "cricket-kit-bag": [
    { name: "Hamza Ali", rating: 5, comment: "Lots of space, strong zips. Fits all my kit including two bats." },
    { name: "Bilal Ahmed", rating: 4, comment: "Good quality wheel bag for the price." },
  ],
  "football-match-size5": [
    { name: "Bilal Hussain", rating: 5, comment: "Our club plays with these every weekend — holds air and shape well." },
    { name: "Mubashar Hussain", rating: 4, comment: "Nice feel, true flight. Good for hard grounds." },
  ],
  "jagga-volleyball-super": [
    { name: "Aftab Ahmed", rating: 5, comment: "Standard Jagga quality. Perfect for village tournament finals." },
    { name: "Waqar Younis", rating: 4, comment: "Good bounce and weight. Delivered fast to Dinga." },
  ],
  "jagga-volleyball-gold": [
    { name: "Mian Asif", rating: 5, comment: "We ordered six balls for our club — all perfect. Wholesale rate was fair." },
    { name: "Sana Fatima", rating: 4, comment: "Durable ball, soft touch even in cold evenings." },
    { name: "Imran Sheikh", rating: 5, comment: "Best volleyball available in Gujrat district. Recommended." },
  ],
  "yonex-carbon-racket": [
    { name: "Fatima Noor", rating: 5, comment: "Genuine Yonex, light and fast for smashes. Very happy." },
    { name: "Ayesha Noor", rating: 4, comment: "Great racket for intermediate players. Stringing was done well." },
  ],
  "feather-shuttlecocks": [
    { name: "Sarmad Ali", rating: 5, comment: "Feathers last several hard games. Good flight stability." },
    { name: "Hira Shahid", rating: 4, comment: "Decent shuttlecocks for the price, will order again." },
  ],
  "gold-trophy-12": [
    { name: "Usman Ghani", rating: 5, comment: "Ordered trophies for our school sports day — shiny and well packed." },
    { name: "Chaudhary Waseem", rating: 4, comment: "Good weight and finish. Delivery was on time." },
  ],
  "dumbbell-set-20kg": [
    { name: "Hamza Tariq", rating: 5, comment: "Solid rods and plates. Perfect starter set for home gym." },
    { name: "Sohail Jutt", rating: 4, comment: "Good build, knurling grip is comfortable." },
  ],
  "kids-cricket-set": [
    { name: "Ayesha Khan", rating: 5, comment: "Bought for my son's birthday — he loves it. Safe and complete set." },
    { name: "Noor Fatima", rating: 4, comment: "Nice gift set, bat and stumps are lightweight for kids." },
  ],
}

interface DemoOrderDef {
  number: string
  name: string
  phone: string
  city: string
  address: string
  status: string
  daysAgo: number
  notes?: string
  paymentMethod?: string
  items: { slug: string; qty: number }[]
}

const DEMO_ORDERS: DemoOrderDef[] = [
  {
    number: "ZSDEMO001", name: "Ali Raza", phone: "03001234501", city: "Dinga",
    address: "Main Bazar, near Jamia Masjid, Dinga", status: "delivered", daysAgo: 28,
    items: [{ slug: "zameer-legend-2026", qty: 1 }],
  },
  {
    number: "ZSDEMO002", name: "Hamza Tariq", phone: "03011234502", city: "Kharian",
    address: "Satellite Town, Block C, Kharian", status: "delivered", daysAgo: 25,
    items: [{ slug: "tape-balls-pack", qty: 2 }, { slug: "tennis-balls-pack", qty: 1 }],
  },
  {
    number: "ZSDEMO003", name: "Usman Ghani", phone: "03021234503", city: "Gujrat",
    address: "Shahi Chowk, Gujrat City", status: "delivered", daysAgo: 23,
    items: [{ slug: "football-match-size5", qty: 2 }],
  },
  {
    number: "ZSDEMO004", name: "Atif Mahmood", phone: "03031234504", city: "Chak Jani",
    address: "Mian Volleyball Club, Chak Jani, Gujrat", status: "delivered", daysAgo: 21,
    notes: "Club order — please include tournament discount",
    items: [{ slug: "jagga-volleyball-gold", qty: 3 }],
  },
  {
    number: "ZSDEMO005", name: "Bilal Hussain", phone: "03041234505", city: "Lala Musa",
    address: "Railway Road, Lala Musa", status: "shipped", daysAgo: 6,
    items: [{ slug: "football-boots", qty: 1 }, { slug: "shin-guards", qty: 1 }],
  },
  {
    number: "ZSDEMO006", name: "Fatima Noor", phone: "03051234506", city: "Gujrat",
    address: "Model Town, near Girls College, Gujrat", status: "shipped", daysAgo: 4,
    items: [{ slug: "yonex-carbon-racket", qty: 1 }, { slug: "feather-shuttlecocks", qty: 2 }],
  },
  {
    number: "ZSDEMO007", name: "Ahmed Raza", phone: "03061234507", city: "Kharian",
    address: "Kutchery Road, Kharian", status: "delivered", daysAgo: 18,
    items: [{ slug: "saki-power-bat", qty: 1 }],
  },
  {
    number: "ZSDEMO008", name: "Sajid Mahmood", phone: "03071234508", city: "Dinga",
    address: "Kolian Road, Dinga", status: "confirmed", daysAgo: 3,
    notes: "School sports day order",
    items: [{ slug: "medals-pack-10", qty: 2 }, { slug: "gold-trophy-12", qty: 1 }],
  },
  {
    number: "ZSDEMO009", name: "Kamran Aslam", phone: "03081234509", city: "Jhelum",
    address: "Civil Lines, Jhelum", status: "confirmed", daysAgo: 2,
    items: [{ slug: "cricket-helmet", qty: 1 }, { slug: "batting-gloves-pro", qty: 1 }],
  },
  {
    number: "ZSDEMO010", name: "Rizwan Ali", phone: "03091234510", city: "Gujranwala",
    address: "Satellite Town, Gujranwala", status: "pending", daysAgo: 1,
    items: [{ slug: "gym-gloves", qty: 1 }, { slug: "speed-skipping-rope", qty: 1 }],
  },
  {
    number: "ZSDEMO011", name: "Talha Munir", phone: "03101234511", city: "Sargodha",
    address: "University Road, Sargodha", status: "pending", daysAgo: 1,
    items: [{ slug: "badminton-racket-beginner", qty: 2 }],
  },
  {
    number: "ZSDEMO012", name: "Ayesha Khan", phone: "03111234512", city: "Islamabad",
    address: "Sector G-11, Islamabad", status: "cancelled", daysAgo: 12,
    notes: "Cancelled by customer — ordered wrong size",
    paymentMethod: "bank",
    items: [{ slug: "kids-cricket-set", qty: 1 }],
  },
]

const CONTACT_MESSAGES = [
  {
    name: "Chaudhary Waseem",
    phone: "03211234567",
    email: "waseem@example.com",
    subject: "Wholesale volleyball order",
    message: "We need 20 Jagga Gold volleyballs for our village tournament next month. Please share the wholesale rate.",
  },
  {
    name: "Sana Fatima",
    phone: "03331234567",
    email: "",
    subject: "Bat re-gripping",
    message: "Do you provide bat re-gripping and knocking service? I live in Gujrat city.",
  },
]

/* ------------------------------------------------------------------- runner */

async function main() {
  const counts = {
    categories: 0,
    products: 0,
    testimonials: 0,
    reviews: 0,
    adminUsers: 0,
    settings: 0,
    orders: 0,
    contactMessages: 0,
  }

  console.log("Seeding ZameerSports.shop database...")

  /* categories */
  for (const cat of catalog.categories) {
    await db.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
        icon: cat.icon,
        featured: cat.featured,
        sortOrder: cat.sortOrder,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        image: cat.image,
        icon: cat.icon,
        featured: cat.featured,
        sortOrder: cat.sortOrder,
      },
    })
    counts.categories++
  }
  console.log(`  categories: ${counts.categories}`)

  const categoryMap = new Map(
    (await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  )

  /* products */
  for (const p of catalog.products) {
    const categoryId = categoryMap.get(p.categorySlug)
    if (!categoryId) throw new Error(`Unknown category ${p.categorySlug} for product ${p.slug}`)
    const data = {
      name: p.name,
      sku: p.slug.toUpperCase(),
      brand: p.brand,
      description: p.description,
      price: p.price,
      comparePrice: p.comparePrice ?? null,
      stock: p.stock,
      images: JSON.stringify([p.image]),
      categoryId,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      isNew: p.isNew,
      badge: p.badge ?? "",
      tags: p.tags ?? "",
      specs: JSON.stringify(buildSpecs(p)),
      sold: p.sold,
      active: true,
    }
    await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    })
    counts.products++
  }
  console.log(`  products: ${counts.products}`)

  /* testimonials — skip existing by name */
  const existingTestimonialNames = new Set(
    (await db.testimonial.findMany({ select: { name: true } })).map((t) => t.name),
  )
  for (const t of TESTIMONIALS) {
    if (existingTestimonialNames.has(t.name)) continue
    await db.testimonial.create({
      data: { name: t.name, location: t.location, text: t.text, rating: t.rating, featured: true },
    })
    counts.testimonials++
  }
  console.log(`  testimonials: ${counts.testimonials} (skipped ${TESTIMONIALS.length - counts.testimonials} existing)`)

  /* reviews — skip products that already have reviews */
  const productsBySlug = new Map(
    (await db.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  )
  const reviewedProductIds = new Set(
    (await db.review.findMany({ select: { productId: true }, distinct: ["productId"] })).map(
      (r) => r.productId,
    ),
  )
  for (const [slug, reviews] of Object.entries(REVIEW_POOL)) {
    const productId = productsBySlug.get(slug)
    if (!productId || reviewedProductIds.has(productId)) continue
    for (const r of reviews) {
      await db.review.create({
        data: { productId, name: r.name, rating: r.rating, comment: r.comment, approved: true },
      })
      counts.reviews++
    }
  }
  console.log(`  reviews: ${counts.reviews} (skipped products already reviewed)`)

  /* admin user */
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zameersports.shop"
  const adminPassword = process.env.ADMIN_PASSWORD || "Zameer@2025"
  await db.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hashPassword(adminPassword) },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      name: "Zameer Sports Admin",
    },
  })
  counts.adminUsers++
  console.log(`  adminUsers: 1 (${adminEmail})`)

  /* settings */
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    counts.settings++
  }
  console.log(`  settings: ${counts.settings}`)

  /* demo orders (with item snapshots) — skip existing by orderNumber */
  const FREE_THRESHOLD = Number(SETTINGS.free_shipping_threshold)
  const SHIPPING_FEE = Number(SETTINGS.shipping_fee)
  const fullProducts = await db.product.findMany({
    where: { slug: { in: DEMO_ORDERS.flatMap((o) => o.items.map((i) => i.slug)) } },
    select: { id: true, slug: true, name: true, price: true, images: true },
  })
  const productBySlug = new Map(fullProducts.map((p) => [p.slug, p]))
  const existingOrderNumbers = new Set(
    (await db.order.findMany({ select: { orderNumber: true } })).map((o) => o.orderNumber),
  )

  for (const def of DEMO_ORDERS) {
    if (existingOrderNumbers.has(def.number)) continue
    const lineItems = def.items
      .map((i) => {
        const p = productBySlug.get(i.slug)
        if (!p) throw new Error(`Demo order product missing: ${i.slug}`)
        return {
          productId: p.id,
          name: p.name,
          price: p.price,
          qty: i.qty,
          image: JSON.parse(p.images)[0] ?? "",
        }
      })
    const subtotal = lineItems.reduce((s, i) => s + i.price * i.qty, 0)
    const shipping = subtotal >= FREE_THRESHOLD ? 0 : SHIPPING_FEE
    const createdAt = new Date(Date.now() - def.daysAgo * 24 * 60 * 60 * 1000)
    await db.order.create({
      data: {
        orderNumber: def.number,
        customerName: def.name,
        phone: def.phone,
        email: "",
        address: def.address,
        city: def.city,
        notes: def.notes ?? "",
        subtotal,
        shipping,
        total: subtotal + shipping,
        paymentMethod: def.paymentMethod ?? "cod",
        status: def.status,
        createdAt,
        items: {
          create: lineItems.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            qty: i.qty,
            image: i.image,
          })),
        },
      },
    })
    counts.orders++
  }
  console.log(`  orders: ${counts.orders} (skipped ${DEMO_ORDERS.length - counts.orders} existing)`)

  /* demo contact messages — skip if table already has rows */
  const msgCount = await db.contactMessage.count()
  if (msgCount === 0) {
    for (const m of CONTACT_MESSAGES) {
      await db.contactMessage.create({ data: m })
      counts.contactMessages++
    }
  }
  console.log(`  contactMessages: ${counts.contactMessages}`)

  console.log("\nSeed complete. Row counts written/ensured:")
  console.log(JSON.stringify(counts, null, 2))
}

main()
  .catch((err) => {
    console.error("SEED FAILED:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
