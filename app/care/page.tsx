import type { Metadata } from "next";
import { ChevronRight, Droplets, FlaskConical, Leaf, Sparkles, Sprout, Sun, Wind } from "lucide-react";
import { careActions, plantAssessment } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Care" };

const careIcons = { droplet: Droplets, sun: Sun, sparkles: Sparkles, wind: Wind };

const guideNotes: Record<string, string> = {
  "refill-reservoir": "Check the water level first, then top up only as needed to stay within the 60–80% range.",
  "rinse-tray": "During your weekly rinse, remove visible dirt and algae from the tray, then refill it with fresh water.",
  "give-full-sun": "Aim for 6–8 hours of direct sunlight each day, and keep a daily eye on the water level in your sunny spot.",
};

export default function CarePage() {
  return (
    <div className="page-content care-page">
      <header className="detail-heading">
        <h1>Everyday care</h1>
        <span className="care-page-note"><Leaf size={15} aria-hidden="true" /> Small acts. More life.</span>
      </header>

      <section className="care-message" aria-labelledby="care-message-heading">
        <span className="care-message-icon"><Sprout size={30} strokeWidth={1.5} aria-hidden="true" /></span>
        <div>
          <div className="summary-heading">
            <h2 id="care-message-heading">Your Purun looks happy!</h2>
            <span className="prototype-label">AI care · Prototype summary</span>
          </div>
          <p>{plantAssessment.summary}</p>
        </div>
      </section>

      <div className="care-detail-grid">
        <section className="care-actions" aria-labelledby="care-actions-heading">
          <h2 id="care-actions-heading" className="sr-only">Ways to care for your Purun</h2>
          {careActions.map((action) => {
            const Icon = careIcons[action.icon];
            return (
              <details className={`care-action care-action-${action.icon}`} key={action.id}>
                <summary>
                  <span className="care-action-icon"><Icon size={27} strokeWidth={1.6} aria-hidden="true" /></span>
                  <span className="care-action-copy">
                    <h3>{action.title}</h3>
                    <span>{action.description}</span>
                  </span>
                  <span className="guide-affordance"><span>View guide</span><ChevronRight size={19} aria-hidden="true" /></span>
                </summary>
                <div className="care-guide"><p>{guideNotes[action.id]}</p></div>
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
