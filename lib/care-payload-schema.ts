import { z } from "zod";
import type { CarePayload } from "./care-summary";

export const carePayloadSchema = z.strictObject({
  headline: z.string().min(1).max(100),
  summary: z.string().min(1).max(400),
  status: z.enum(["thriving", "watch", "danger"]),
  reasons: z.array(z.string().min(1).max(400)).max(8),
  actions: z.array(z.strictObject({
    priority: z.enum(["now", "soon", "monitor"]),
    title: z.string().min(1).max(100),
    detail: z.string().min(1).max(400),
  })).max(3),
  nextCheckSuggestion: z.string().min(1).max(200),
  source: z.enum(["local-rules", "ai-enhanced"]),
}) satisfies z.ZodType<CarePayload>;

const numbers = (text: string) => JSON.stringify(text.match(/\d+(?:[.,]\d+)*/g) ?? []);
const measurements = (text: string) => JSON.stringify((text.match(/\d+(?:[.,]\d+)*(?:[–-]\d+(?:[.,]\d+)*)?\s*(?:%|°C|lux|µg\/m³)/g) ?? []).map((value) => value.replace(/\s/g, "")));
const prohibited = /https?:|www\.|[<>]|\[[^\]]*\]\(|\b(nutrient\w*|fertili[sz]\w*|supplement\w*|buy|purchas\w*|shop\w*|order|medic\w*|diagnos\w*|disease\w*|cur[ei]\w*|treat\w*|toxi\w*|pesticid\w*|emergency|dying)\b/i;

/** Shape validation alone cannot enforce meaning; preserve the care decisions exactly.
 * Free wording is additionally screened for numeric drift and prohibited content.
 */
export function validateCarePayload(value: unknown, fallback: CarePayload): CarePayload {
  const care = carePayloadSchema.parse(value);
  if (care.source === "local-rules") {
    if (JSON.stringify(care) !== JSON.stringify(fallback)) throw new Error("Changed local advice");
    return fallback;
  }
  if (care.status !== fallback.status || JSON.stringify(care.reasons) !== JSON.stringify(fallback.reasons)
    || care.nextCheckSuggestion !== fallback.nextCheckSuggestion || care.actions.length !== fallback.actions.length) throw new Error("Changed care decisions");
  if (/\d/.test(care.headline + care.summary)) throw new Error("Unsupported measurement in explanation");
  for (const [index, action] of care.actions.entries()) {
    const original = fallback.actions[index];
    if (action.priority !== original.priority || action.title !== original.title || numbers(action.detail) !== numbers(original.detail)
      || measurements(action.detail) !== measurements(original.detail)) throw new Error("Changed care action");
  }
  if ([care.headline, care.summary, ...care.actions.map((action) => action.detail)].some((text) => !text.trim() || prohibited.test(text))) throw new Error("Unsupported advice");
  return care;
}
