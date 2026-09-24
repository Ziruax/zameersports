import { NextResponse } from "next/server"
import { z } from "zod"
import { execute, query } from "@/lib/db"
import type { ContactMessageRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
import { toAdminMessage } from "../../_lib/mappers"

type Params = { params: Promise<{ id: string }> }

const MessageReadSchema = z.object({
  read: z.boolean(),
})

/** PATCH /api/admin/messages/[id] — { read: boolean } → mark read/unread. → { ok, message } */
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = MessageReadSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)

  try {
    await withRetry(
      // `read` is a MySQL reserved word — backticked
      () => execute("UPDATE ContactMessage SET `read` = ? WHERE id = ?", [parsed.data.read, id]),
      { label: "admin:messages:update" },
    )

    const message = await withRetry(
      () =>
        query<ContactMessageRow>("SELECT * FROM ContactMessage WHERE id = ? LIMIT 1", [id]).then(
          (rows) => rows[0] ?? null,
        ),
      { label: "admin:messages:get-updated" },
    )
    if (!message) return notFound("Message not found")
    return NextResponse.json({ ok: true, message: toAdminMessage(message) })
  } catch (err) {
    return dbErrorResponse(err, "admin:messages:update")
  }
}

/** DELETE /api/admin/messages/[id] — delete a contact message. → { ok: true } */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const res = await withRetry(() => execute("DELETE FROM ContactMessage WHERE id = ?", [id]), {
      label: "admin:messages:delete",
    })
    if (res.affectedRows === 0) return notFound("Message not found")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return dbErrorResponse(err, "admin:messages:delete")
  }
}
