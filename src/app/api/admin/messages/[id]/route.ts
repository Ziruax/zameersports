import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, prismaErrorCode, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
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
    const message = await withRetry(
      () => db.contactMessage.update({ where: { id }, data: { read: parsed.data.read } }),
      { label: "admin:messages:update" },
    )
    return NextResponse.json({ ok: true, message: toAdminMessage(message) })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Message not found")
    return dbErrorResponse(err, "admin:messages:update")
  }
}

/** DELETE /api/admin/messages/[id] — delete a contact message. → { ok: true } */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    await withRetry(() => db.contactMessage.delete({ where: { id } }), { label: "admin:messages:delete" })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Message not found")
    return dbErrorResponse(err, "admin:messages:delete")
  }
}
