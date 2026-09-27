// Server routes only: credentials and provider transport never enter client components.
import { z } from "zod";
import { aiModels, defaultAIModel, getAIConfiguration, getAIEndpoint } from "./ai-config";
import type { AIStatus } from "./ai-status";

export const simulatedReadingSchema = z.strictObject({
  id: z.string().min(1).max(150), timestamp: z.iso.datetime(), source: z.literal("simulation"),
  waterLevelPct: z.number().min(0).max(100), waterTempC: z.number().min(10).max(45),
  lightLux: z.number().min(0).max(40000), pm25UgM3: z.number().min(0).max(150),
  airTempC: z.number().min(-50).max(60), humidityPct: z.number().min(0).max(100),
});
const responseSchema = z.object({
  status: z.literal("completed"),
  output: z.array(z.discriminatedUnion("type", [z.object({
    type: z.literal("message"),
    content: z.array(z.object({ type: z.literal("output_text"), text: z.string().max(12000) })).length(1),
  }), z.object({ type: z.literal("reasoning") })])).min(1).max(4),
});

// ponytail: shared per-instance cooldown; use a distributed rate limiter for a public service.
let nextRequestAt = 0;

export async function requestAIJSON(options: {
  model?: string; signal: AbortSignal; instructions: string; input: unknown;
  schema: z.ZodType; name: string;
}): Promise<{ status: AIStatus; data?: unknown }> {
  const config = getAIConfiguration();
  if (config.status !== "ready") return { status: config.status };
  const model = aiModels.find((entry) => entry.id === (options.model ?? defaultAIModel) && entry.selectable);
  if (!model) return { status: "unsupported-model" };
  if (options.signal.aborted) return { status: "network-error" };
  if (Date.now() < nextRequestAt) return { status: "cooldown" };
  nextRequestAt = Date.now() + 5000;
  const timeout = AbortSignal.timeout(20000);
  try {
    const response = await fetch(getAIEndpoint()!, {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.any([options.signal, timeout]),
      body: JSON.stringify({
        model: model.id, store: false, max_output_tokens: 3000,
        ...(model.reasoning !== "none" ? { reasoning: { effort: model.reasoning } } : {}),
        instructions: options.instructions, input: JSON.stringify(options.input),
        text: { format: { type: "json_schema", name: options.name, strict: true,
          schema: z.toJSONSchema(options.schema, { target: "draft-7" }) } },
      }),
    });
    if (!response.ok) return { status: response.status === 401 || response.status === 403 ? "auth-error"
      : response.status === 404 ? "model-unavailable" : response.status === 429 ? "rate-limited" : "provider-error" };
    try {
      const result = responseSchema.parse(await response.json());
      const messages = result.output.filter((item) => item.type === "message");
      if (messages.length !== 1) return { status: "invalid-output" };
      return { status: "enhanced", data: JSON.parse(messages[0].content[0].text) as unknown };
    } catch { return { status: timeout.aborted ? "timeout" : "invalid-output" }; }
  } catch {
    return { status: timeout.aborted ? "timeout" : "network-error" };
  }
}
