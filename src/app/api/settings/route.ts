import { getSettings } from "@/lib/settings"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../_lib/helpers"

export const dynamic = "force-dynamic"

/** GET /api/settings — all store settings as a map (60s in-memory cache, defaults fallback). */
export async function GET() {
  try {
    const settings = await withRetry(() => getSettings(), { label: "settings:get" })
    return Response.json(settings)
  } catch (err) {
    return dbErrorResponse(err, "settings:get")
  }
}
