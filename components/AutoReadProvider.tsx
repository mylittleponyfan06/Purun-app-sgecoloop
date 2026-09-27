"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePurunStore } from "@/store/usePurunStore";
import LeafLoader from "./LeafLoader";

const ClockContext = createContext<number | null>(null);

export default function AutoReadProvider({ children }: { children: ReactNode }) {
  const ready = usePurunStore((state) => state.hasHydrated);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const state = usePurunStore.getState();
    state.setAutoReadEnabled(state.autoReadEnabled);
    function tick() {
      const time = Date.now();
      usePurunStore.getState().runAutoRead(time);
      setNow(time);
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    // This provider lives once in the root layout; route changes do not remount it.
    return () => window.clearInterval(timer);
  }, [ready]);

  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function AutoReadStatus({ compact = false }: { compact?: boolean }) {
  const now = useContext(ClockContext);
  const enabled = usePurunStore((state) => state.autoReadEnabled);
  const next = usePurunStore((state) => state.nextReadAt);
  const timestamp = usePurunStore((state) => state.currentReading.timestamp);
  const modalOpen = usePurunStore((state) => state.isSimulationModalOpen);
  const label = `Auto-read ${enabled ? "ON" : "OFF"}`;
  if (compact) return <span className="live-status"><span className={`status-dot${enabled ? "" : " is-off"}`} />{label}</span>;
  const remaining = now !== null && next !== null ? Math.max(0, Math.ceil((next - now) / 1000)) : null;
  const elapsed = now !== null ? Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000)) : null;
  return (
    <div className="schedule-copy">
      <p className="auto-read-label"><span className={`status-dot${enabled ? "" : " is-off"}`} /> {label}</p>
      <p>{!enabled ? "Read when you choose CHECK NOW" : modalOpen ? "Next read waits for Demo controls to close" : remaining === null ? "Starting local schedule…" : `Next read in ${duration(remaining)}`}</p>
      {elapsed === null ? <LeafLoader compact label="Restoring last reading…" /> : <p>Last reading {duration(elapsed)} ago</p>}
    </div>
  );
}
