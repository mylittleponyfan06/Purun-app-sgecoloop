import { Sparkles } from "lucide-react";

export default function AiSummaryCard({ summary }: { summary: string }) {
  return (
    <section className="ai-summary-card" aria-label="AI Care Check">
      <div className="summary-heading">
        <h2><Sparkles size={19} aria-hidden="true" /> AI Care Check</h2>
        <span className="prototype-label">Prototype summary</span>
      </div>
      <p>{summary}</p>
    </section>
  );
}
