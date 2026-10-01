"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePurunStore } from "@/store/usePurunStore";
import { useCareAIEnabled } from "./CareAIProvider";
import LeafLoader from "./LeafLoader";

type Reading = ReturnType<typeof usePurunStore.getState>["currentReading"];

// Strip any trailing slash so we never build "//trigger".
const RELAY = (process.env.NEXT_PUBLIC_RELAY_URL ?? "").replace(/\/+$/, "");
const KEY = encodeURIComponent(process.env.NEXT_PUBLIC_RELAY_KEY ?? "");

// Sends the signal to the relay, then waits up to ~6s for Unity's reading.
// Returns null on any failure so the caller can fall back to the local reading.
async function fetchUnityReading(): Promise<Partial<Reading> | null> {
  if (!RELAY || !KEY) return null;
  try {
    await fetch(`${RELAY}/trigger?key=${KEY}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 400));
      const res = await fetch(`${RELAY}/reading?key=${KEY}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    }
  } catch {
    // Relay or Unity unavailable: fall back to the local reading.
  }
  return null;
}

export default function CheckNowButton() {
  const ready = usePurunStore((state) => state.hasHydrated);
  const aiEnabled = useCareAIEnabled();
  const [feedback, setFeedback] = useState<"idle" | "checking" | "success" | "error">("idle");
  const busy = useRef(false);
  const cancelled = useRef(false);
  const feedbackId = useId();
  const checking = feedback === "checking";

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  useEffect(() => {
    if (feedback !== "success") return;
    const timeout = window.setTimeout(() => setFeedback("idle"), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function checkNow() {
    const initial = usePurunStore.getState();
    if (busy.current || !initial.hasHydrated || initial.isSimulationModalOpen) return;
    busy.current = true;
    setFeedback("checking");

    // Keeps the 700 ms minimum animation while waiting for Unity.
    const [unity] = await Promise.all([
      fetchUnityReading(),
      new Promise((r) => setTimeout(r, 700)),
    ]);
    busy.current = false;
    if (cancelled.current) return; // navigated away

    const state = usePurunStore.getState();
    // Never overwrite a newer applied reading or interrupt an open demo modal.
    if (state.currentReading.id !== initial.currentReading.id || state.isSimulationModalOpen) {
      setFeedback("idle");
      return;
    }
    try {
      const values = unity ? { ...unity } : {};
      delete (values as Record<string, unknown>).receivedAt;
      state.applySimulatedReading({ ...state.currentReading, ...values });
      setFeedback("success");
      // Local assessment is already visible; an optional rewrite cannot block it.
      void usePurunStore.getState().enhanceCareSummary(aiEnabled);
    } catch {
      setFeedback("error");
    }

        try {
      const values = unity ? { ...unity } : {};
      delete (values as Record<string, unknown>).receivedAt;
      const merged = { ...state.currentReading, ...values };
      console.log("Applying reading:", merged);
      state.applySimulatedReading(merged);
      setFeedback("success");
      void usePurunStore.getState().enhanceCareSummary(aiEnabled);
    } catch (err) {
      console.error("Check failed:", err);
      setFeedback("error");
    }
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
