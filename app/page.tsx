"use client";

import { Droplets, FlaskConical, Leaf, Sun, Thermometer, Wind } from "lucide-react";
import AiSummaryCard from "@/components/AiSummaryCard";
import CheckNowButton from "@/components/CheckNowButton";
import PlantHealthOrb from "@/components/PlantHealthOrb";
import SensorStatusCard from "@/components/SensorStatusCard";
import OutdoorPulseCard from "@/components/OutdoorPulseCard";
import { usePurunStore } from "@/store/usePurunStore";
import { getLightProblemLabel, getSensorConditions } from "@/lib/plant-rules";
import { DemoControlsButton } from "@/components/SimulationModal";
import DangerAlert from "@/components/DangerAlert";
import { AutoReadStatus } from "@/components/AutoReadProvider";
import { generateCareSummary } from "@/lib/care-summary";

export default function HomePage() {
  const { currentReading, currentAssessment: plantAssessment, isSimulationMode, carePayload } = usePurunStore();
  const condition = getSensorConditions(currentReading);
  return (
    <div className="page-content home-dashboard">
      <p className="demo-banner"><FlaskConical size={16} aria-hidden="true" /> Prototype demo — readings are currently simulated.</p>
      <div className="dashboard-heading">
        <h1>{plantAssessment.status === "danger" ? "A little care for today." : "A good day to grow."}</h1>
        <span className="station-tag"><Leaf size={15} aria-hidden="true" /> Purun Loop · Station 01</span>
        <DemoControlsButton />
      </div>
      <DangerAlert />
      <div className="dashboard-grid">
        <div className="plant-column">
          <PlantHealthOrb score={plantAssessment.score} status={plantAssessment.status} />
          <div className="reading-schedule">
            <CheckNowButton />
            <AutoReadStatus />
          </div>
        </div>
        <div className="readings-column">
          <section aria-labelledby="sensor-heading">
            <h2 id="sensor-heading" className="sr-only">Your station readings</h2>
            <div className="sensor-grid">
              <SensorStatusCard title="Water" value={`${currentReading.waterLevelPct}%`} description={condition.water === "good" ? "Good range" : condition.water === "watch" ? "Refill soon" : "Refill now"} icon={Droplets} tone="water" state={condition.water} />
              <SensorStatusCard title="Light" value={condition.light === "good" ? "Optimal" : getLightProblemLabel(currentReading.lightLux)} description={isSimulationMode ? `${currentReading.lightLux.toLocaleString("en-SG")} lux` : "6–8 hrs/day"} icon={Sun} tone="sun" state={condition.light} />
              <SensorStatusCard title="Air" value={{ good: "Clean", watch: "Moderate", danger: "Elevated" }[condition.air]} description={`PM2.5: ${currentReading.pm25UgM3} µg/m³`} icon={Wind} tone="leaf" state={condition.air} />
              <SensorStatusCard title="Water temperature" value={`${currentReading.waterTempC}°C`} description={condition.temperature === "good" ? "Ideal for Purun" : currentReading.waterTempC < 22 ? "Water is too cool" : "Water is too warm"} icon={Thermometer} tone="clay" state={condition.temperature} />
            </div>
          </section>
          <OutdoorPulseCard />
          {isSimulationMode && <p className="simulation-note">Simulated humidity: {currentReading.humidityPct}% · not included in the health score</p>}
          <AiSummaryCard care={carePayload ?? generateCareSummary(plantAssessment)} isSimulationMode={isSimulationMode} />
        </div>
      </div>
    </div>
  );
}
