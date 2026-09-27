import type { Metadata } from "next";
import { Droplets, Leaf, Sun, Thermometer, Wind } from "lucide-react";
import SensorStatusCard from "@/components/SensorStatusCard";
import { currentReading, plantAssessment } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Health" };

export default function HealthPage() {
  return (
    <div className="page-content health-page">
      <header className="detail-heading">
        <div>
          <h1>Plant health</h1>
          <p>A little window into your wetland.</p>
        </div>
        <span className="prototype-label">Simulated reading</span>
      </header>

      <div className="health-detail-grid">
        <figure className="wetland-illustration">
          <span className="wetland-status"><Leaf size={15} aria-hidden="true" /> {plantAssessment.headline}</span>
          <svg viewBox="0 0 420 420" role="img" aria-labelledby="wetland-title wetland-description">
            <title id="wetland-title">A thriving Purun wetland</title>
            <desc id="wetland-description">Tall green reeds rise towards the sun, with branching roots visible beneath a clear teal water line.</desc>
            <circle cx="321" cy="91" r="60" fill="#efc85c" opacity=".12" />
            <circle cx="321" cy="91" r="35" fill="#edc461" />
            <g stroke="#c79a38" strokeWidth="2" strokeLinecap="round">
              <path d="M321 39V28M321 143V154M269 91H258M373 91H384M284 54L276 46M358 128L366 136M284 128L276 136M358 54L366 46" />
            </g>
            <g fill="#82996a" opacity=".14">
              <path d="M73 283Q35 193 50 120Q79 196 73 283ZM74 283Q79 210 109 178Q105 246 74 283Z" />
              <path d="M356 283Q335 209 349 170Q369 226 356 283ZM355 283Q366 227 395 201Q389 252 355 283Z" />
            </g>
            <path d="M0 269Q54 260 106 268T211 267T317 268T420 265V420H0Z" fill="#8bb9aa" opacity=".52" />
            <path d="M0 269Q54 260 106 268T211 267T317 268T420 265" stroke="#287c78" strokeWidth="2" fill="none" />
            <path d="M0 280Q80 274 160 281T320 281T420 279" stroke="#f9fff2" strokeWidth="2" fill="none" opacity=".8" />
            <ellipse cx="208" cy="270" rx="75" ry="11" stroke="#287c78" opacity=".35" fill="none" />
            <g stroke="#83764e" strokeLinecap="round" fill="none">
              <path d="M202 270Q172 306 179 367M206 271Q194 329 218 383M213 270Q238 304 232 368M214 271Q256 297 268 339M198 269Q159 291 145 336" strokeWidth="3" />
              <path d="M180 309L165 323L156 348M178 330L192 346L193 366M203 318L218 336L225 350M210 364L197 381M235 312L253 324L263 354M234 338L220 354M255 310L276 315M158 311L140 316L127 334" strokeWidth="1.6" />
            </g>
            <g fill="#3b7050">
              <path d="M202 271Q169 147 188 37Q209 151 202 271Z" />
              <path d="M204 272Q212 121 249 61Q249 180 204 272Z" />
              <path d="M200 271Q144 176 122 91Q171 137 200 271Z" />
              <path d="M208 272Q250 164 292 128Q273 208 208 272Z" />
              <path d="M199 272Q150 225 126 170Q173 191 199 272Z" />
            </g>
            <g fill="#7f995d">
              <path d="M206 272Q188 192 208 110Q224 183 206 272Z" />
              <path d="M204 272Q218 199 250 160Q247 229 204 272Z" />
            </g>
            <g stroke="#b7c786" strokeWidth="1" opacity=".75" fill="none">
              <path d="M202 265L189 54M205 266Q227 158 245 79M198 263Q159 172 129 105" />
            </g>
            <g fill="#f5fae9" opacity=".7">
              <circle cx="109" cy="318" r="3" /><circle cx="297" cy="353" r="4" /><circle cx="316" cy="313" r="2" />
            </g>
            <path d="M35 371H85M307 387H373M69 397H111" stroke="#5e9687" strokeLinecap="round" opacity=".45" />
          </svg>
          <figcaption>Rooted in water. Reaching for the sun.</figcaption>
        </figure>

        <div className="health-conditions">
          <section aria-labelledby="conditions-heading">
            <h2 id="conditions-heading" className="sr-only">Current conditions</h2>
            <div className="sensor-grid">
              <SensorStatusCard title="Water level" value={`${currentReading.waterLevelPct}%`} description="Plenty of water for happy roots." icon={Droplets} tone="water" />
              <SensorStatusCard title="Light exposure" value={`${currentReading.lightLux.toLocaleString("en-SG")} lux`} description="A bright spot for healthy growth." icon={Sun} tone="sun" />
              <SensorStatusCard title="Air quality" value={`${currentReading.pm25UgM3} µg/m³`} description="Clean air around your plant." icon={Wind} tone="leaf" />
              <SensorStatusCard title="Water temperature" value={`${currentReading.waterTempC}°C`} description="Comfortably warm for your Purun." icon={Thermometer} tone="water" />
            </div>
          </section>
          <section className="health-meaning" aria-labelledby="meaning-heading">
            <h2 id="meaning-heading"><Leaf size={19} aria-hidden="true" /> What this means</h2>
            <p>Your Purun is doing well because water and light are in its healthy range. A little everyday care will help it keep growing.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
