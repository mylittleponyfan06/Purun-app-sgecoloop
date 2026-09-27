export type PlantStatus = "thriving" | "watch" | "danger";

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
