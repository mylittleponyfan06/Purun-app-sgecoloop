"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { aiStatusMessages, type AIConfiguration } from "@/lib/ai-status";
import { usePurunStore } from "@/store/usePurunStore";
import LeafLoader from "./LeafLoader";

const CareAIContext = createContext<AIConfiguration>({ enabled: false, status: "disabled", provider: "Provider not configured", models: [], defaultModel: "" });

export const useCareAIConfiguration = () => useContext(CareAIContext);
export const useCareAIEnabled = () => useContext(CareAIContext).enabled;

export default function CareAIProvider({ config, children }: { config: AIConfiguration; children: ReactNode }) {
  const ready = usePurunStore((state) => state.hasHydrated);
  useEffect(() => {
    if (!ready) return;
    const state = usePurunStore.getState();
    if (!config.models.some((model) => model.selectable && model.id === state.selectedAIModel)) state.setAIModel(config.defaultModel);
  }, [ready, config]);
  return <CareAIContext.Provider value={config}>{children}</CareAIContext.Provider>;
}

export function CareAIStatus() {
  const config = useCareAIConfiguration();
  const selected = usePurunStore((state) => state.selectedAIModel) || config.defaultModel;
  const check = usePurunStore((state) => state.aiCheck);
  const status = config.status !== "ready" ? config.status : check?.status ?? "ready";
  const model = config.models.find((entry) => entry.id === (check?.model || selected));
  return <div className="care-ai-status" role="status" aria-atomic="true">
    {status === "loading" ? <LeafLoader compact announce={false} label="Preparing your care explanation…" detail="Your local care advice is already available." /> : <p>{aiStatusMessages[status]}</p>}
    <p>{model?.name || selected || "No text model available"} · {config.provider}{check?.checkedAt ? ` · Last attempt ${new Date(check.checkedAt).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}</p>
  </div>;
}
