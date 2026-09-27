export type PlantStatus = "thriving" | "watch" | "danger";

// Outdoor context stays independent of the simulated planter readings.
export type OutdoorPulse = {
  available: boolean;
  location: "Singapore" | "Your area";
  timeZone: string;
  updatedAt: string;
  pm25: { value: number | null; status: "clean" | "moderate" | "elevated" | "unavailable"; label: string };
  weather: { label: string; temperatureC: number | null; rainProbabilityPct: number | null };
  sunlight: { label: string; bestWindow: string; shortwaveRadiationWm2: number | null };
  careCue: { title: string; message: string; tone: "good" | "watch" | "caution" };
  attribution: string;
};

export type SensorReading = {
  id: string;
  timestamp: string;
  source: "simulation";
  waterLevelPct: number;
  waterTempC: number;
  lightLux: number;
  pm25UgM3: number;
  airTempC: number;
  humidityPct: number;
};

export type CareAction = {
  id: string;
  priority: "now" | "soon" | "monitor";
  title: string;
  description: string;
  icon: "droplet" | "sun" | "sparkles" | "wind";
};

export type PlantAssessment = {
  score: number;
  status: PlantStatus;
  headline: string;
  summary: string;
  reasons: string[];
  actions: CareAction[];
  updatedAt: string;
};
