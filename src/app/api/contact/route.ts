import { z } from "zod"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../_lib/helpers"

const PHONE_RE = /^[0-9+\-\s]{10,15}$/

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.union([z.email("Invalid email address"), z.literal("")]).optional(),
  phone: z.union([z.string().trim().regex(PHONE_RE, "Invalid phone number"), z.literal("")]).optional(),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(2000),
})

/** POST /api/contact — store a contact message. */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
      },
      { status: 400 },
    )
  }
  const { name, message } = parsed.data

  try {
    await withRetry(
      () =>
        db.contactMessage.create({
          data: {
            name,
            email: parsed.data.email || "",
            phone: parsed.data.phone || "",
            subject: parsed.data.subject || "",
            message,
          },
        }),
      { label: "contact:create" },
    )
    return Response.json({ ok: true }, { status: 201 })
  } catch (err) {
    return dbErrorResponse(err, "contact:create")
  }
}
