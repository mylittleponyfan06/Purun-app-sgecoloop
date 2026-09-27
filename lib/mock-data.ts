import type { CareAction, PlantAssessment, SensorReading } from "./types";

// One fixed snapshot per module load; no timers or random values.
const snapshotTime = Date.now();
const hourMs = 60 * 60 * 1000;

export const currentReading: SensorReading = {
  id: "simulation-current",
  timestamp: new Date(snapshotTime).toISOString(),
  source: "simulation",
  waterLevelPct: 72,
  waterTempC: 26,
  lightLux: 18000,
  pm25UgM3: 12,
  airTempC: 29,
  humidityPct: 72,
};

export const careActions: CareAction[] = [
  {
    id: "refill-reservoir",
    priority: "monitor",
    title: "Refill reservoir",
    description: "Keep the water level between 60% and 80%; there is enough water for now.",
    icon: "droplet",
  },
  {
    id: "rinse-tray",
    priority: "soon",
    title: "Rinse tray",
    description: "Gently rinse away dirt and algae to keep the tray fresh for your Purun.",
    icon: "sparkles",
  },
  {
    id: "give-full-sun",
    priority: "monitor",
    title: "Give full sun",
    description: "Keep your Purun in a sunny spot, aiming for 6 to 8 hours of direct sunlight a day.",
    icon: "sun",
  },
];

export const plantAssessment: PlantAssessment = {
  score: 82,
  status: "thriving",
  headline: "Thriving",
  summary: "Your Purun is looking happy. Enjoy your coffee while a little everyday care keeps this wetland growing.",
  reasons: [
    "The reservoir has a comfortable water level.",
    "The water is warm and the light is bright.",
    "The air is clear, with plenty of humidity.",
  ],
  actions: careActions,
  updatedAt: currentReading.timestamp,
};

// Oldest first: 24 hourly snapshots preceding the current reading.
export const historicalReadings: SensorReading[] = Array.from(
  { length: 24 },
  (_, index) => ({
    ...currentReading,
    id: `simulation-history-${index + 1}`,
    timestamp: new Date(snapshotTime - (24 - index) * hourMs).toISOString(),
    waterLevelPct: 76 - Math.floor(index / 6),
    waterTempC: 25 + (index % 3),
    lightLux: 16000 + (index % 5) * 1000,
    pm25UgM3: 10 + (index % 5),
    airTempC: 28 + (index % 3),
    humidityPct: 70 + (index % 5),
  }),
);
