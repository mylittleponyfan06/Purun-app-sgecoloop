"use client";

import { Droplets, FlaskConical, Leaf, Sun, Thermometer, Wind } from "lucide-react";
import AiSummaryCard from "@/components/AiSummaryCard";
import CheckNowButton from "@/components/CheckNowButton";
import PlantHealthOrb from "@/components/PlantHealthOrb";
import SensorStatusCard from "@/components/SensorStatusCard";
import OutdoorPulseCard from "@/components/OutdoorPulseCard";
import { usePurunStore } from "@/store/usePurunStore";
import { getSensorConditions } from "@/lib/plant-rules";
import { DemoControlsButton } from "@/components/SimulationModal";
import DangerAlert from "@/components/DangerAlert";

export default function HomePage() {
  const { currentReading, currentAssessment: plantAssessment, isSimulationMode, autoReadInterval } = usePurunStore();
  const condition = getSensorConditions(currentReading);
  return (
    <div className="page-content home-dashboard">
      <p className="demo-banner"><FlaskConical size={16} aria-hidden="true" /> Prototype demo — readings are currently simulated.</p>
      <div className="dashboard-heading">
        <h1>{plantAssessment.status === "danger" ? "A little care for today." : "A good day to grow."}</h1>
        <span className="station-tag"><Leaf size={15} aria-hidden="true" /> Purun · Station 01</span>
        <DemoControlsButton />
      </div>
      <DangerAlert />
      <div className="dashboard-grid">
        <div className="plant-column">
          <PlantHealthOrb score={plantAssessment.score} status={plantAssessment.status} />
          <div className="reading-schedule">
            <CheckNowButton />
            <div className="schedule-copy">
              <p className="auto-read-label"><span className="status-dot" /> {isSimulationMode ? "Manual demo reading" : "Auto-read ON"}</p>
              {/* Fixed prototype labels, not a running countdown. */}
              <p>{isSimulationMode ? `Auto-read interval: ${autoReadInterval} min · paused` : "Next read in 42 minutes"}</p>
              <p>{isSimulationMode ? `Last applied: ${new Date(currentReading.timestamp).toLocaleString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} SGT` : "Last reading: 12 minutes ago"}</p>
            </div>
          </div>
        </div>
        <div className="readings-column">
          <section aria-labelledby="sensor-heading">
            <h2 id="sensor-heading" className="sr-only">Your station readings</h2>
            <div className="sensor-grid">
              <SensorStatusCard title="Water" value={`${currentReading.waterLevelPct}%`} description={condition.water === "good" ? "Good range" : condition.water === "watch" ? "Refill soon" : "Refill now"} icon={Droplets} tone="water" state={condition.water} />
              <SensorStatusCard title="Light" value={condition.light === "good" ? "Optimal" : "Low light"} description={isSimulationMode ? `${currentReading.lightLux.toLocaleString("en-SG")} lux` : "6–8 hrs/day"} icon={Sun} tone="sun" state={condition.light} />
              <SensorStatusCard title="Air" value={{ good: "Clean", watch: "Moderate", danger: "Elevated" }[condition.air]} description={`PM2.5: ${currentReading.pm25UgM3} µg/m³`} icon={Wind} tone="leaf" state={condition.air} />
              <SensorStatusCard title="Water temperature" value={`${currentReading.waterTempC}°C`} description={condition.temperature === "good" ? "Ideal for Purun" : currentReading.waterTempC < 22 ? "Water is too cool" : "Water is too warm"} icon={Thermometer} tone="clay" state={condition.temperature} />
            </div>
          </section>
          <OutdoorPulseCard />
          {isSimulationMode && <p className="simulation-note">Simulated humidity: {currentReading.humidityPct}% · not included in the health score</p>}
          <AiSummaryCard summary={isSimulationMode ? plantAssessment.summary : "Purun is healthy. Light is optimal. Reservoir will need a refill in about one day."} />
        </div>
      </div>
    </div>
  );
}
