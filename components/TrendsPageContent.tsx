"use client";
import { Sparkles } from "lucide-react";
import HealthTrendChart from "@/components/HealthTrendChart";
import { sunlightTrend, sunlightWindow } from "@/lib/mock-data";
import { usePurunStore } from "@/store/usePurunStore";
import DangerModeBanner from "./DangerModeBanner";
import LeafLoader from "./LeafLoader";


export default function TrendsPage() {
  const { currentReading, currentAssessment: plantAssessment, history, isSimulationMode, hasHydrated } = usePurunStore();
  const end = Date.parse(currentReading.timestamp);
  const readings = history.filter(({ reading }) => Date.parse(reading.timestamp) >= end - 24 * 3600000 && Date.parse(reading.timestamp) <= end);
  const health = readings.map(({ reading, score }) => ({ timestamp: Date.parse(reading.timestamp), value: score }));
  const reservoir = readings.map(({ reading }) => ({ timestamp: Date.parse(reading.timestamp), value: reading.waterLevelPct }));
  const sunlight = readings.map(({ reading }) => ({ timestamp: Date.parse(reading.timestamp), value: reading.lightLux }));
  return (
    <div className="page-content trends-page">
      <header className="detail-heading">
        <h1>Natural rhythms</h1>
        <span className="prototype-label">Local demo · Singapore time</span>
      </header>
      <DangerModeBanner />
      {hasHydrated ? <HealthTrendChart
        health={health}
        sunlight={isSimulationMode ? sunlight : sunlightTrend}
        reservoir={reservoir}
        sunlightWindow={isSimulationMode ? [end - 24 * 3600000, end] : sunlightWindow}
        currentScore={plantAssessment.score}
        reservoirLevel={currentReading.waterLevelPct}
        simulation={isSimulationMode}
      /> : <LeafLoader label="Restoring your local history…" detail="Gathering the readings for your charts." />}
      <section className="trend-insight" aria-labelledby="trend-insight-heading">
        <span className="trend-insight-icon"><Sparkles size={23} aria-hidden="true" /></span>
        <div>
          <div className="summary-heading"><h2 id="trend-insight-heading">A little insight</h2><span className="prototype-label">Prototype summary</span></div>
          <p>{isSimulationMode ? `Latest simulated assessment: ${plantAssessment.score}/100. ${plantAssessment.summary}` : "Plant health is up 12% this week due to consistent sunlight."}</p>
        </div>
      </section>
    </div>
  );
}
