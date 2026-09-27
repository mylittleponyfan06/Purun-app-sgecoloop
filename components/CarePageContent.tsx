"use client";
import { ChevronRight, Droplets, FlaskConical, Leaf, Sparkles, Sprout, Sun, Wind } from "lucide-react";
import { careActions as routineCareActions } from "@/lib/mock-data";
import { usePurunStore } from "@/store/usePurunStore";
import OutdoorPulseCard from "@/components/OutdoorPulseCard";
import DangerModeBanner from "./DangerModeBanner";
import { prioritizeCareActions } from "@/lib/care-actions";
import { generateCareSummary } from "@/lib/care-summary";
import { CareAIStatus } from "./CareAIProvider";


const careIcons = { droplet: Droplets, sun: Sun, sparkles: Sparkles, wind: Wind };

const guideNotes: Record<string, string> = {
  "refill-reservoir": "Check the water level first, then top up only as needed to stay within the 60–80% range.",
  "rinse-tray": "During your weekly rinse, remove visible dirt and algae from the tray, then refill it with fresh water.",
  "give-full-sun": "Aim for 6–8 hours of direct sunlight each day, and keep a daily eye on the water level in your sunny spot.",
};

export default function CarePage() {
  const { currentAssessment: plantAssessment, isSimulationMode, carePayload } = usePurunStore();
  const care = carePayload ?? generateCareSummary(plantAssessment);
  const assessedActions = prioritizeCareActions(plantAssessment.actions);
  // Keep existing guide IDs/icons for danger links; advice text comes from the payload.
  const careActions = care.actions.length ? care.actions.map((action, index) => ({
    ...assessedActions[index], title: action.title, description: action.detail, priority: action.priority,
  })) : prioritizeCareActions(routineCareActions);
  return (
    <div className="page-content care-page">
      <header className="detail-heading">
        <h1>Everyday care</h1>
        <span className="care-page-note"><Leaf size={15} aria-hidden="true" /> Small acts. More life.</span>
      </header>

      <DangerModeBanner />
      <section className="care-message" aria-labelledby="care-message-heading">
        <span className="care-message-icon"><Sprout size={30} strokeWidth={1.5} aria-hidden="true" /></span>
        <div>
          <div className="summary-heading">
            <h2 id="care-message-heading">{care.headline}</h2>
            <span className="prototype-label">{care.source === "ai-enhanced" ? "AI-enhanced explanation" : "Local care logic"}</span>
          </div>
          <p>{care.summary}</p>
          {isSimulationMode && <p className="care-summary-note">Advice based on a simulated reading.</p>}
          <p className="care-summary-note">{care.nextCheckSuggestion}</p>
          <CareAIStatus />
        </div>
      </section>

      <OutdoorPulseCard compact />

      <div className="care-detail-grid">
        <section className="care-actions" id="care-actions" aria-labelledby="care-actions-heading">
          <h2 id="care-actions-heading" className={care.actions.length ? "sr-only" : "care-routine-heading"}>{care.actions.length ? "Ways to care for your Purun" : "Routine care guides"}</h2>
          {careActions.map((action, index) => {
            const Icon = careIcons[action.icon];
            return (
              <details className={`care-action care-action-${action.icon}`} id={`care-${action.id}`} open={care.status === "danger" && care.actions.length > 0 && index === 0} key={action.id}>
                <summary>
                  <span className="care-action-icon"><Icon size={27} strokeWidth={1.6} aria-hidden="true" /></span>
                  <span className="care-action-copy">
                    <h3>{action.title}</h3>
                    {isSimulationMode && <span className="care-priority">{action.priority === "now" ? "Do now" : action.priority === "soon" ? "Plan soon" : "Keep an eye on it"}</span>}
                    <span>{action.description}</span>
                  </span>
                  <span className="guide-affordance"><span>View guide</span><ChevronRight size={19} aria-hidden="true" /></span>
                </summary>
                <div className="care-guide"><p>{isSimulationMode && plantAssessment.actions.length ? action.description : guideNotes[action.id]}</p></div>
              </details>
            );
          })}
        </section>

        <div className="care-sidebar">
          <section className="care-rhythm" aria-labelledby="rhythm-heading">
            <h2 id="rhythm-heading">Care rhythm</h2>
            <p>A few small habits go a long way.</p>
            <dl>
              <div><dt>Daily</dt><dd>Glance at water level</dd></div>
              <div><dt>Weekly</dt><dd>Rinse and refill tray</dd></div>
              <div><dt>Seasonal</dt><dd>Inspect roots and pot condition</dd></div>
            </dl>
          </section>
          <section className="care-roadmap" aria-labelledby="roadmap-heading">
            <FlaskConical size={21} aria-hidden="true" />
            <div>
              <h2 id="roadmap-heading">Future capability: nutrient monitoring</h2>
              <p>Not active in this prototype.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
