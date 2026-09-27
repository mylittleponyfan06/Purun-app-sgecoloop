"use client";

import { Sun } from "lucide-react";
import { autoReadOptions, usePurunStore } from "@/store/usePurunStore";
import { AutoReadStatus } from "./AutoReadProvider";

export default function AutoReadSettings() {
  const { autoReadInterval, autoReadEnabled, hasHydrated, setAutoReadInterval, setAutoReadEnabled } = usePurunStore();
  return (
    <section className="auto-read-card" aria-labelledby="auto-read-heading">
      <div className="solar-clock" aria-hidden="true"><Sun size={52} strokeWidth={1.3} /><span /></div>
      <div className="auto-read-settings">
        <h2 id="auto-read-heading">Auto-read schedule</h2>
        <p>A little rhythm for your wetland. Check the current simulated values at a pace that suits your demo.</p>
        <label className="auto-read-toggle">
          <span>Auto-read</span>
          <input type="checkbox" role="switch" checked={autoReadEnabled} disabled={!hasHydrated || autoReadInterval === 0} onChange={(event) => setAutoReadEnabled(event.target.checked)} aria-describedby="auto-read-help" />
        </label>
        <fieldset className="auto-read-options" disabled={!hasHydrated}>
          <legend>Reading interval</legend>
          {autoReadOptions.map((option) => <label key={option.minutes}>
            <input type="radio" name="auto-read-interval" value={option.minutes} checked={autoReadInterval === option.minutes} onChange={() => setAutoReadInterval(option.minutes)} />
            <span>{option.label}</span>
          </label>)}
        </fieldset>
        <p id="auto-read-help">{autoReadInterval === 0 ? "Manual mode keeps auto-read off. Choose an interval to enable it." : "Turn Auto-read on to start. Changing the interval or taking a reading restarts the countdown."}</p>
        <div className="auto-read-status"><AutoReadStatus /></div>
        <p className="auto-read-note">Local simulation only · runs while this app is open. Device sleep can delay a reading; missed readings are not backfilled.</p>
      </div>
    </section>
  );
}
