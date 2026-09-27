import { generateCareSummary, type CarePayload } from "./care-summary";
import { validateCarePayload } from "./care-payload-schema";
import type { PlantAssessment, SensorReading } from "./types";
import { isAIStatus, type AIStatus } from "./ai-status";

export async function getCarePayload(reading: SensorReading, assessment: PlantAssessment, enabled = false, signal?: AbortSignal,
  options: { model?: string; onStatus?: (status: AIStatus) => void } = {}): Promise<CarePayload> {
  const fallback = generateCareSummary(assessment);
  const local = (status: AIStatus) => { options.onStatus?.(status); return fallback; };
  if (!enabled) return local("disabled");
  if (signal?.aborted) return local("network-error");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; abort(); }, 25000);
  try {
    const response = await fetch("/api/ai-summary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reading, model: options.model }), signal: controller.signal, cache: "no-store",
    });
    const status = response.headers.get("X-Care-AI-Status");
    if (!response.ok) return local(isAIStatus(status) ? status : "provider-error");
    try {
      const care = validateCarePayload(await response.json(), fallback);
      options.onStatus?.(care.source === "ai-enhanced" ? "enhanced" : isAIStatus(status) && status !== "enhanced" ? status : "invalid-output");
      return care;
    } catch { return local("invalid-output"); }
  } catch {
    return local(timedOut ? "timeout" : "network-error");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
