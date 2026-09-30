"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePurunStore } from "@/store/usePurunStore";
import { useCareAIEnabled } from "./CareAIProvider";
import LeafLoader from "./LeafLoader";

function sendSignal() {
  const base = (process.env.NEXT_PUBLIC_RELAY_URL ?? "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_RELAY_KEY ?? "";
  if (!base || !key) return; // not configured, send nothing
  fetch(`${base}/trigger?key=${encodeURIComponent(key)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

export default function CheckNowButton() {
  const ready = usePurunStore((state) => state.hasHydrated);
  const aiEnabled = useCareAIEnabled();
  const [feedback, setFeedback] = useState<"idle" | "checking" | "success" | "error">("idle");
  const pendingCheck = useRef<number | null>(null);
  const feedbackId = useId();
  const checking = feedback === "checking";

  useEffect(() => () => {
    if (pendingCheck.current !== null) window.clearTimeout(pendingCheck.current);
  }, []);

  useEffect(() => {
    if (feedback !== "success") return;
    const timeout = window.setTimeout(() => setFeedback("idle"), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

   function checkNow() {
    const initial = usePurunStore.getState();
    if (pendingCheck.current !== null || !initial.hasHydrated || initial.isSimulationModalOpen) return;
    setFeedback("checking");
    pendingCheck.current = window.setTimeout(() => {
      pendingCheck.current = null;
      const state = usePurunStore.getState();
      if (state.currentReading.id !== initial.currentReading.id || state.isSimulationModalOpen) {
        setFeedback("idle");
        return;
      }
      try {
        state.applySimulatedReading(state.currentReading);
        sendSignal(); // <-- new: only fires when the check really went through
        setFeedback("success");
        void usePurunStore.getState().enhanceCareSummary(aiEnabled);
      } catch {
        setFeedback("error");
      }
    }, 700);
  }

  return (
    <div className="check-control">
      <div className="check-sunburst">
        <button className="check-now-button" type="button" onClick={checkNow} disabled={!ready || checking} aria-label="CHECK NOW" aria-busy={checking} aria-describedby={feedbackId} title="Run a local simulated care check">
          {checking || !ready ? <LeafLoader compact announce={false} label={checking ? "Checking" : "Loading"} /> : <span>CHECK<br />NOW</span>}
        </button>
      </div>
      <p className="check-feedback" id={feedbackId} role="status" aria-atomic="true">
        {checking ? "Checking local values…" : feedback === "success" ? "Care check updated just now" : feedback === "error" ? "Couldn’t update. Please try again." : "Local simulation only"}
      </p>
    </div>
  );
}