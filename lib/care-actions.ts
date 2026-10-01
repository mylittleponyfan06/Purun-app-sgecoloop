import type { CareAction, PlantAssessment } from "./types";

const priorityOrder = { now: 0, soon: 1, monitor: 2 };

export function prioritizeCareActions(actions: readonly CareAction[]): CareAction[] {
  // Stable sorting preserves the rules engine's impact order within each priority.
  return [...actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function getDangerAdvice(assessment: PlantAssessment) {
  // Status is the only trigger: no sensor, score or outdoor-context checks here.
  if (assessment.status !== "danger") return null;
  const action = prioritizeCareActions(assessment.actions)[0];
  const headlines: Record<string, string> = {
    "refill-reservoir": "Water low — refill today",
    "move-to-brighter-daylight": "Light is low — find a brighter spot",
    "check-water-temperature": "Water temperature — check today",
    "reduce-haze-exposure": "Haze nearby — reduce exposure",
  };
  // plant-rules.ts gives the light action the title "Reduce strong light" when the reading is too bright.
  const tooBright = action?.id === "move-to-brighter-daylight" && action.title === "Reduce strong light";
  return {
    headline: action ? (tooBright ? "Light is strong — find a shadier spot" : headlines[action.id] ?? action.title) : "A little care is needed today",
    explanation: assessment.reasons.join(" ") || assessment.summary,
    actionLabel: action?.title ?? "View care steps",
    href: action ? `/care#care-${encodeURIComponent(action.id)}` : "/care#care-actions",
    actionId: action?.id,
  };
}