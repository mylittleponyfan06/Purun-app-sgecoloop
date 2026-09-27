"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { currentReading, historicalReadings, healthTrend, plantAssessment } from "../lib/mock-data";
import { assessPlant } from "../lib/plant-rules";
import type { PlantAssessment, SensorReading } from "../lib/types";

export const simulationFields = [
  { key: "lightLux", label: "Light intake", unit: "lux", min: 0, max: 40000, step: 500 },
  { key: "pm25UgM3", label: "PM2.5", unit: "µg/m³", min: 0, max: 150, step: 1 },
  { key: "waterLevelPct", label: "Water level", unit: "%", min: 0, max: 100, step: 1 },
  { key: "waterTempC", label: "Water temperature", unit: "°C", min: 10, max: 45, step: 1 },
  { key: "humidityPct", label: "Humidity", unit: "%", min: 0, max: 100, step: 1 },
] as const;

export type SimulationValues = Pick<SensorReading, typeof simulationFields[number]["key"]>;
const healthy: SimulationValues = { lightLux: 18000, pm25UgM3: 12, waterLevelPct: 72, waterTempC: 26, humidityPct: 72 };
export const scenarios = {
  "Thriving wetland": healthy,
  "Low reservoir": { ...healthy, waterLevelPct: 20 },
  "Low light": { ...healthy, lightLux: 3000 },
  "Haze event": { ...healthy, pm25UgM3: 80 },
  "Multiple issues": { ...healthy, waterLevelPct: 20, lightLux: 3000, waterTempC: 37, pm25UgM3: 80, humidityPct: 50 },
} satisfies Record<string, SimulationValues>;

type HistoryEntry = { reading: SensorReading; score: number };
type PurunState = {
  currentReading: SensorReading;
  currentAssessment: PlantAssessment;
  autoReadInterval: number;
  isSimulationModalOpen: boolean;
  isSimulationMode: boolean;
  hasHydrated: boolean;
  storageWarning: boolean;
  draftReading: SimulationValues;
  history: HistoryEntry[];
  setSimulationModalOpen: (open: boolean) => void;
  updateDraft: (values: Partial<SimulationValues>) => void;
  applySimulatedReading: (values: SimulationValues) => void;
  loadScenario: (name: keyof typeof scenarios) => void;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved demo");
  return value as Record<string, unknown>;
}

function validateValues(value: unknown): SimulationValues {
  const values = record(value);
  for (const field of simulationFields) {
    const number = values[field.key];
    if (typeof number !== "number" || !Number.isFinite(number) || number < field.min || number > field.max) throw new RangeError(`Invalid ${field.label}`);
  }
  return { lightLux: values.lightLux as number, pm25UgM3: values.pm25UgM3 as number, waterLevelPct: values.waterLevelPct as number, waterTempC: values.waterTempC as number, humidityPct: values.humidityPct as number };
}

function validateReading(value: unknown): SensorReading {
  const reading = record(value);
  const values = validateValues(reading);
  if (typeof reading.id !== "string" || typeof reading.timestamp !== "string" || !Number.isFinite(Date.parse(reading.timestamp)) || reading.source !== "simulation" || typeof reading.airTempC !== "number" || !Number.isFinite(reading.airTempC)) throw new Error("Invalid saved reading");
  return { ...values, id: reading.id, timestamp: reading.timestamp, source: "simulation", airTempC: reading.airTempC };
}

function warnStorage() {
  queueMicrotask(() => {
    if (!usePurunStore.getState().storageWarning) usePurunStore.setState({ storageWarning: true });
  });
}

export const usePurunStore = create<PurunState>()(persist((set, get) => ({
  currentReading,
  currentAssessment: plantAssessment,
  autoReadInterval: 60, // Minutes; reserved setting, no scheduler runs.
  isSimulationModalOpen: false,
  isSimulationMode: false,
  hasHydrated: false,
  storageWarning: false,
  draftReading: { ...healthy },
  history: [...historicalReadings, currentReading].map((reading, index) => ({ reading, score: healthTrend[index].value })),
  setSimulationModalOpen: (open) => set({ isSimulationModalOpen: open, ...(open ? { draftReading: validateValues(get().currentReading) } : {}) }),
  updateDraft: (values) => set({ draftReading: validateValues({ ...get().draftReading, ...values }) }),
  loadScenario: (name) => set({ draftReading: { ...scenarios[name] } }),
  applySimulatedReading: (values) => {
    const reading: SensorReading = {
      ...get().currentReading, ...validateValues(values), source: "simulation",
      id: `simulation-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${get().history.length}`}`, timestamp: new Date().toISOString(),
    };
    const assessment = assessPlant(reading);
    const cutoff = Date.parse(reading.timestamp) - 24 * 3600000;
    const history = [...get().history.filter(({ reading }) => Date.parse(reading.timestamp) >= cutoff), { reading, score: assessment.score }].slice(-120);
    set({ currentReading: reading, currentAssessment: assessment, history, isSimulationMode: true, isSimulationModalOpen: false });
  },
}), {
  name: "purun-demo-state",
  version: 1,
  storage: createJSONStorage(() => ({
    getItem: (name) => { try { return localStorage.getItem(name); } catch { warnStorage(); return null; } },
    setItem: (name, value) => { try { localStorage.setItem(name, value); } catch { warnStorage(); } },
    removeItem: (name) => { try { localStorage.removeItem(name); } catch { warnStorage(); } },
  })),
  skipHydration: true,
  partialize: ({ currentReading, currentAssessment, autoReadInterval, isSimulationMode, history }) => ({ currentReading, currentAssessment, autoReadInterval, isSimulationMode, history }),
  merge: (saved, current) => {
    try {
      const state = record(saved);
      const reading = validateReading(state.currentReading);
      if (typeof state.isSimulationMode !== "boolean" || !Array.isArray(state.history)) return current;
      const history = state.history.slice(-120).map((value: unknown) => {
        const entry = record(value);
        if (typeof entry.score !== "number" || !Number.isFinite(entry.score) || entry.score < 0 || entry.score > 100) throw new Error("Invalid saved score");
        return { reading: validateReading(entry.reading), score: entry.score };
      }).sort((a, b) => Date.parse(a.reading.timestamp) - Date.parse(b.reading.timestamp));
      const assessment = state.isSimulationMode ? assessPlant(reading) : plantAssessment;
      const timestamp = Date.parse(reading.timestamp);
      const restoredHistory = [...history.filter((entry) => entry.reading.id !== reading.id && Date.parse(entry.reading.timestamp) >= timestamp - 24 * 3600000 && Date.parse(entry.reading.timestamp) <= timestamp), { reading, score: assessment.score }].slice(-120);
      return {
        ...current, currentReading: reading, history: restoredHistory, isSimulationMode: state.isSimulationMode,
        // Recompute the active assessment rather than trusting an edited saved score.
        currentAssessment: assessment,
        autoReadInterval: typeof state.autoReadInterval === "number" && Number.isFinite(state.autoReadInterval) && state.autoReadInterval > 0 ? state.autoReadInterval : 60,
      };
    } catch { return current; }
  },
}));
