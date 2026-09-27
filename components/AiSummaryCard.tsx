import { Sparkles } from "lucide-react";
import type { CarePayload } from "@/lib/care-summary";
import { CareAIStatus } from "./CareAIProvider";

export default function AiSummaryCard({ care, isSimulationMode }: { care: CarePayload; isSimulationMode: boolean }) {
  return (
    <section className="ai-summary-card" aria-label="AI Care Check">
      <div className="summary-heading">
        <h2><Sparkles size={19} aria-hidden="true" /> AI Care Check</h2>
        <span className="prototype-label">{care.source === "ai-enhanced" ? "AI-enhanced explanation" : "Local care logic"}</span>
      </div>
      <h3 className="care-summary-headline">{care.headline}</h3>
      <p>{care.summary}</p>
      {isSimulationMode && <p className="care-summary-note">Advice based on a simulated reading.</p>}
      {care.actions.length > 0 && <ul className="care-summary-actions">{care.actions.map((action, index) => <li key={index}><strong>{action.title}</strong><span>{action.detail}</span></li>)}</ul>}
      <p className="care-summary-note">{care.nextCheckSuggestion}</p>
      <CareAIStatus />
    </section>
  );
}
