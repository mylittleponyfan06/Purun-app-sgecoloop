export const aiStatusMessages = {
  ready: "Ready to try. Run CHECK NOW to verify this model.",
  loading: "Requesting an AI explanation… Local care stays available.",
  enhanced: "AI replied and its explanation passed validation.",
  disabled: "AI is disabled on the server. Using local care logic.",
  "missing-key": "No server API key is configured. Using local care logic.",
  "missing-url": "Set AI_BASE_URL to your token's provider URL. Using local care logic.",
  "invalid-url": "The server provider URL is invalid. Using local care logic.",
  "unsupported-model": "This model is not a supported text model in your catalog. Choose another model.",
  cooldown: "Checks are close together. Wait a few seconds, then try again.",
  "auth-error": "The provider rejected the key or access. Check the key and provider URL.",
  "model-unavailable": "The provider could not find this model or endpoint. Check the provider URL and model.",
  "rate-limited": "The provider's usage limit was reached. Using local care logic.",
  "provider-error": "The provider could not complete this request. Using local care logic.",
  timeout: "AI took too long to reply. Using local care logic.",
  "invalid-output": "AI replied, but its explanation did not pass care validation. Using local care logic.",
  "network-error": "Could not reach the AI service. Using local care logic.",
} as const;

export type AIStatus = keyof typeof aiStatusMessages;
export type AICheck = { status: AIStatus; model: string; checkedAt: string | null };
export type AIModel = { id: string; name: string; selectable: boolean; reasoning: string };
export type AIConfiguration = { enabled: boolean; status: AIStatus; provider: string; models: AIModel[]; defaultModel: string };

export function isAIStatus(value: string | null): value is AIStatus {
  return value !== null && Object.hasOwn(aiStatusMessages, value);
}
