import { NextResponse } from "next/server"
import { z } from "zod"
import { execute } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { getSettings } from "@/lib/settings"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { badRequest, readJson, requireAdmin, unauthorized, zodBadRequest } from "../_lib/guard"

/**
 * Accepts BOTH body shapes:
 *   { "updates": { key: "value", ... } }   (documented build shape)
 *   { key: "value", ... }                  (flat shape — also accepted)
 * Each patch may carry at most 50 keys.
 */
const WrappedSchema = z.object({
  updates: z.record(z.string(), z.string()).optional(),
})
const FlatSchema = z.record(z.string(), z.string())

/**
 * PATCH /api/admin/settings — upsert settings, invalidate the settings cache,
 * then re-query and return the full settings map (same shape as GET /api/settings,
 * defaults merged over DB values).
 */
export async function PATCH(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  let rawMap: Record<string, string>
  const wrapped = WrappedSchema.safeParse(json)
  if (wrapped.success && wrapped.data.updates !== undefined) {
    rawMap = wrapped.data.updates
  } else {
    const flat = FlatSchema.safeParse(json)
    if (!flat.success) return zodBadRequest(flat.error)
    rawMap = flat.data
  }

  const updates: Record<string, string> = {}
  for (const [rawKey, value] of Object.entries(rawMap)) {
    const key = rawKey.trim()
    if (!key) return badRequest("Setting keys must be non-empty strings")
    if (key.length > 100) return badRequest("Setting key too long (max 100 characters)")
    if (value.length > 5000) return badRequest("Setting value too long (max 5000 characters)")
    updates[key] = value
  }
  const entries = Object.entries(updates)
  if (entries.length > 50) return badRequest("Too many settings in one request (max 50)")

  try {
    if (entries.length > 0) {
      // Single atomic multi-row upsert (`key`/`value` are reserved words — backticked).
      const placeholders = entries.map(() => "(?, ?)").join(", ")
      const params: unknown[] = []
      for (const [key, value] of entries) params.push(key, value)
      await withRetry(
        () =>
          execute(
            `INSERT INTO Setting (\`key\`, \`value\`) VALUES ${placeholders} ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
            params,
          ),
        { label: "admin:settings:update" },
      )
    }

    cacheInvalidate("settings")
    // getSettings() falls back to defaults on a transient read error (no retry
    // inside), so re-read briefly until the written keys are reflected.
    let settings = await getSettings()
    for (let i = 0; i < 3 && !entries.every(([k, v]) => settings[k] === v); i++) {
      await new Promise((r) => setTimeout(r, 400))
      cacheInvalidate("settings")
      settings = await getSettings()
    }
    return NextResponse.json(settings)
  } catch (err) {
    return dbErrorResponse(err, "admin:settings:update")
  }
}
