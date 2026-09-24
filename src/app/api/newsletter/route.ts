import { z } from "zod"
import { execute, newId } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../_lib/helpers"

const NewsletterSchema = z.object({
  email: z.email("Please enter a valid email address"),
})

/** POST /api/newsletter — subscribe (upsert → idempotent on re-subscribe). */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = NewsletterSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  try {
    await withRetry(
      () =>
        execute(
          "INSERT INTO Subscriber (id, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)",
          [newId(), parsed.data.email],
        ),
      { label: "newsletter:upsert" },
    )
    return Response.json({ ok: true }, { status: 201 })
  } catch (err) {
    return dbErrorResponse(err, "newsletter:upsert")
  }
}
