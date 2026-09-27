import { prioritizeCareActions } from "./care-actions";
import type { PlantAssessment } from "./types";

export type CarePayload = {
  headline: string;
  summary: string;
  status: "thriving" | "watch" | "danger";
  reasons: string[];
  actions: Array<{
    priority: "now" | "soon" | "monitor";
    title: string;
    detail: string;
  }>;
  nextCheckSuggestion: string;
  source: "local-rules" | "ai-enhanced";
};

/** Offline wording only: no readings, clock, store, network or new health decisions.
 * Simulation provenance belongs to the UI because PlantAssessment has no mode flag.
 */
export function generateCareSummary(assessment: PlantAssessment): CarePayload {
  const actions = prioritizeCareActions(assessment.actions).slice(0, 3).map((action) => ({
    priority: action.priority, title: action.title, detail: action.description,
  }));
  const first = actions[0];
  const introduction = {
    thriving: "Purun is doing well overall.",
    watch: "A little care will help Purun feel more comfortable.",
    danger: "Purun needs some attention today.",
  }[assessment.status];
  return {
    headline: {
      thriving: "Your Purun looks happy!",
      watch: "A little care for your Purun",
      danger: "Action needed today",
    }[assessment.status],
    summary: `${introduction} ${first ? `Next step: ${first.title}.` : assessment.status === "thriving" ? "Keep up your usual care rhythm." : "Review the assessment reasons before making changes."}`,
    status: assessment.status,
    reasons: [...assessment.reasons],
    actions,
    nextCheckSuggestion: assessment.status === "danger" || first?.priority === "now"
      ? "Check again after the first care step."
      : assessment.status === "watch" || first?.priority === "soon"
        ? "Check again after your next care step."
        : "Check again at your next regular care check.",
    source: "local-rules",
  };
}
