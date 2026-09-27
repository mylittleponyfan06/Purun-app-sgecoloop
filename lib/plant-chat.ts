import { z } from "zod";
import { generateCareSummary } from "./care-summary";
import { currentReading, plantAssessment } from "./mock-data";
import { assessPlant } from "./plant-rules";
import type { PlantAssessment, SensorReading } from "./types";

export const chatMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000),
});
export const chatAnswerSchema = z.strictObject({ reply: z.string().trim().min(1).max(2000) });
export const chatResponseSchema = chatAnswerSchema.extend({ source: z.enum(["ai-enhanced", "local-rules"]) });
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export function getChatAssessment(reading: SensorReading, isSimulationMode: boolean): PlantAssessment {
  // The untouched design preview has a curated score of 82. Never accept an arbitrary client assessment.
  const seed = !isSimulationMode && reading.id === currentReading.id &&
    (Object.keys(currentReading) as (keyof SensorReading)[]).every((key) => key === "timestamp" || reading[key] === currentReading[key]);
  return seed ? { ...plantAssessment, updatedAt: reading.timestamp } : assessPlant(reading);
}

export function localChatReply(assessment: PlantAssessment, question: string): string {
  const care = generateCareSummary(assessment);
  const explainScore = /why|score|reason/i.test(question);
  const detail = explainScore
    ? care.reasons.join(" ")
    : care.actions[0]?.detail ?? care.nextCheckSuggestion;
  const introduction = {
    thriving: "Your Purun is doing well.",
    watch: "Your Purun could use a little care.",
    danger: "Your Purun needs attention today.",
  }[assessment.status];
  // Conversational wording only; leave the assessment and visible source labels intact.
  return `${introduction} ${explainScore ? `Your health score is ${assessment.score}/100. ` : ""}${care.actions[0] ? `Start with: ${care.actions[0].title}. ` : ""}${detail}`
    .replace(/\bsimulated\s+/gi, "")
    .replace(/\bprototype(?:'s)?\s+/gi, "");
}
