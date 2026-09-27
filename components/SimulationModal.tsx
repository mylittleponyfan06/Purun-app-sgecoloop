"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, SlidersHorizontal, X } from "lucide-react";
import { scenarios, simulationFields, usePurunStore } from "@/store/usePurunStore";

export function DemoControlsButton() {
  const open = usePurunStore((state) => state.setSimulationModalOpen);
  const ready = usePurunStore((state) => state.hasHydrated);
  return <button type="button" className="demo-controls-button" onClick={() => open(true)} disabled={!ready}><SlidersHorizontal size={15} aria-hidden="true" /> Demo controls</button>;
}

export function SimulationModeLabel() {
  const active = usePurunStore((state) => state.isSimulationMode);
  const storageWarning = usePurunStore((state) => state.storageWarning);
  return <>{active ? <span className="simulation-mode" role="status"><FlaskConical size={13} aria-hidden="true" /> SIMULATION MODE</span> : <span className="preview-label">Static preview</span>}{storageWarning && <span className="simulation-storage-warning" role="status">Browser storage unavailable · changes last until reload</span>}</>;
}

export default function SimulationModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const { isSimulationModalOpen, draftReading, updateDraft, loadScenario, applySimulatedReading, setSimulationModalOpen } = usePurunStore();

  useEffect(() => {
    Promise.resolve(usePurunStore.persist.rehydrate()).finally(() => usePurunStore.setState({ hasHydrated: true }));
  }, []);

  useEffect(() => {
    if (!isSimulationModalOpen) { dialog.current?.close(); return; }
    setError("");
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isSimulationModalOpen]);

  return (
    <dialog ref={dialog} className="simulation-dialog" aria-labelledby="simulation-title" aria-describedby="simulation-description" onCancel={() => setSimulationModalOpen(false)} onClose={() => setSimulationModalOpen(false)}>
      <form onSubmit={(event) => {
        event.preventDefault();
        try { applySimulatedReading(draftReading); }
        catch { setError("These values couldn’t be applied. Please choose a scenario and try again."); }
      }}>
        <header className="simulation-heading">
          <div><h2 id="simulation-title">Simulation Controls</h2><p id="simulation-description">Prototype demo only — these values model future sensor readings.</p></div>
          <button type="button" className="simulation-close" aria-label="Close simulation controls" onClick={() => setSimulationModalOpen(false)}><X size={21} aria-hidden="true" /></button>
        </header>
        <fieldset className="simulation-scenarios">
          <legend>Start with a scenario</legend>
          {(Object.keys(scenarios) as (keyof typeof scenarios)[]).map((name) => <button type="button" key={name} onClick={() => loadScenario(name)}>{name}</button>)}
        </fieldset>
        <div className="simulation-sliders">
          {simulationFields.map((field) => <div className="simulation-slider" key={field.key}>
            <div><label htmlFor={`sim-${field.key}`}>{field.label}</label><output htmlFor={`sim-${field.key}`}>{draftReading[field.key].toLocaleString("en-SG")} {field.unit}</output></div>
            <input id={`sim-${field.key}`} type="range" min={field.min} max={field.max} step={field.step} value={draftReading[field.key]} aria-valuetext={`${draftReading[field.key]} ${field.unit}`} onChange={(event) => updateDraft({ [field.key]: Number(event.target.value) })} />
          </div>)}
        </div>
        <p className="simulation-note">Changes take effect only when you apply. Humidity is displayed but does not affect the prototype score.</p>
        {error && <p role="alert" className="simulation-error">{error}</p>}
        <footer className="simulation-footer">
          <button type="button" className="simulation-cancel" onClick={() => setSimulationModalOpen(false)}>Cancel</button>
          <button type="submit" className="simulation-apply">Apply simulated reading</button>
        </footer>
      </form>
    </dialog>
  );
}
