// Imported only by server components and route handlers. The full catalog never goes to the browser.
import catalog from "../codex-models.json" with { type: "json" };
import { z } from "zod";
import type { AIConfiguration, AIModel } from "./ai-status";

const catalogSchema = z.object({ models: z.array(z.object({
  slug: z.string().regex(/^[a-zA-Z0-9._-]+$/), display_name: z.string().min(1).max(100),
  supported_in_api: z.boolean(), default_reasoning_level: z.string(),
  supported_reasoning_levels: z.array(z.object({ effort: z.string() })),
})) });
const parsed = catalogSchema.safeParse(catalog);
export const aiModels: AIModel[] = parsed.success ? parsed.data.models.filter((model) => model.supported_in_api).map((model) => ({
  id: model.slug, name: model.display_name,
  selectable: !/audio|realtime/i.test(model.slug),
  reasoning: model.supported_reasoning_levels.some((level) => level.effort === "low") ? "low" : model.default_reasoning_level,
})) : [];
export const defaultAIModel = aiModels.find((model) => model.id === "gpt-5.6-luna" && model.selectable)?.id
  ?? aiModels.find((model) => model.selectable)?.id ?? "";

export function getAIEndpoint(): string | null {
  try {
    const url = new URL(process.env.AI_BASE_URL ?? "");
    if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return null;
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/responses`;
    return url.toString();
  } catch { return null; }
}

export function getAIConfiguration(): AIConfiguration {
  const enabled = process.env.AI_ENABLED === "true";
  const endpoint = getAIEndpoint();
  return {
    enabled, models: aiModels, defaultModel: defaultAIModel,
    provider: endpoint ? new URL(endpoint).hostname : "Provider not configured",
    status: !enabled ? "disabled" : !process.env.AI_API_KEY?.trim() ? "missing-key"
      : !process.env.AI_BASE_URL?.trim() ? "missing-url" : !endpoint ? "invalid-url" : "ready",
  };
}
