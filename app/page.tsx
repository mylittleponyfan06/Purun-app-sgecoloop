import { Droplets, FlaskConical, Leaf, Sun, Thermometer, Wind } from "lucide-react";
import AiSummaryCard from "@/components/AiSummaryCard";
import CheckNowButton from "@/components/CheckNowButton";
import PlantHealthOrb from "@/components/PlantHealthOrb";
import SensorStatusCard from "@/components/SensorStatusCard";
import { currentReading, plantAssessment } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="page-content home-dashboard">
      <p className="demo-banner"><FlaskConical size={16} aria-hidden="true" /> Prototype demo — readings are currently simulated.</p>
      <div className="dashboard-heading">
        <h1>A good day to grow.</h1>
        <span className="station-tag"><Leaf size={15} aria-hidden="true" /> Purun · Station 01</span>
      </div>
      <div className="dashboard-grid">
        <div className="plant-column">
          <PlantHealthOrb score={plantAssessment.score} status={plantAssessment.status} />
          <div className="reading-schedule">
            <CheckNowButton />
            <div className="schedule-copy">
              <p className="auto-read-label"><span className="status-dot" /> Auto-read ON</p>
              {/* Fixed prototype labels, not a running countdown. */}
              <p>Next read in 42 minutes</p>
              <p>Last reading: 12 minutes ago</p>
            </div>
          </div>
        </div>
        <div className="readings-column">
          <section aria-labelledby="sensor-heading">
            <h2 id="sensor-heading" className="sr-only">Your station readings</h2>
            <div className="sensor-grid">
              <SensorStatusCard title="Water" value={`${currentReading.waterLevelPct}%`} description="Good range" icon={Droplets} tone="water" />
              <SensorStatusCard title="Light" value="Optimal" description="6–8 hrs/day" icon={Sun} tone="sun" />
              <SensorStatusCard title="Air" value="Clean" description={`PM2.5: ${currentReading.pm25UgM3} µg/m³`} icon={Wind} tone="leaf" />
              <SensorStatusCard title="Water temperature" value={`${currentReading.waterTempC}°C`} description="Ideal for Purun" icon={Thermometer} tone="clay" />
            </div>
          </section>
          <AiSummaryCard summary="Purun is healthy. Light is optimal. Reservoir will need a refill in about one day." />
        </div>
      </div>
    </div>
  );
}
