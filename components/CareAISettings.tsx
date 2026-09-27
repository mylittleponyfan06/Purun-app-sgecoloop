"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { usePurunStore } from "@/store/usePurunStore";
import { CareAIStatus, useCareAIConfiguration } from "./CareAIProvider";

export default function CareAISettings() {
  const config = useCareAIConfiguration();
  const { selectedAIModel, setAIModel, hasHydrated } = usePurunStore();
  return (
    <section className="care-ai-settings" aria-labelledby="care-ai-heading">
      <h2 id="care-ai-heading"><Sparkles size={22} aria-hidden="true" /> Care explanation model</h2>
      <p>Choose the model for your next care check. Plant health always comes from local care logic.</p>
      <label htmlFor="care-ai-model">AI model</label>
      <select id="care-ai-model" value={selectedAIModel || config.defaultModel} onChange={(event) => setAIModel(event.target.value)} disabled={!hasHydrated || !config.models.length} aria-describedby="care-ai-model-help">
        {config.models.map((model) => <option key={model.id} value={model.id} disabled={!model.selectable}>{model.name}{model.selectable ? "" : " — audio/realtime, not used for care text"}</option>)}
      </select>
      <p id="care-ai-model-help">Models come from your catalog. A listed model is only verified when a request succeeds.</p>
      <CareAIStatus />
      <Link href="/" className="back-link">Go to Home and use CHECK NOW →</Link>
    </section>
  );
}
