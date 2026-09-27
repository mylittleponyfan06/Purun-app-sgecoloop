import type { PlantAssessment } from "@/lib/types";

type PlantHealthOrbProps = Pick<PlantAssessment, "score" | "status">;

export default function PlantHealthOrb({ score, status }: PlantHealthOrbProps) {
  return (
    <section className="plant-health-panel" aria-label="Plant health">
      <h2 className="orb-heading">Plant health</h2>
      <div className="orb-landscape">
        <div className={`health-orb health-orb-${status}`}>
          <div className="orb-face">
            <p className="orb-score">{score}<span className="sr-only"> out of 100</span></p>
            <p className="orb-status">{status === "danger" ? "CARE TODAY" : status.toUpperCase()}</p>
            <p className="orb-caption" aria-hidden="true">{status === "thriving" ? "a happy little wetland" : status === "watch" ? "a little care goes a long way" : "time for a little care"}</p>
          </div>
        </div>
        <svg className="orb-reeds" viewBox="0 0 360 300" fill="none" aria-hidden="true" focusable="false">
          <g fill="currentColor">
            <path d="M65 276C36 223 23 131 41 45C57 128 58 195 65 276Z" />
            <path d="M66 276C31 242 12 211 7 172C40 197 54 233 66 276Z" />
            <path d="M66 276C49 213 61 156 90 114C88 186 71 229 66 276Z" />
            <path d="M293 276C315 218 324 139 316 76C297 144 296 214 293 276Z" />
            <path d="M293 276C329 250 346 213 353 167C325 193 306 235 293 276Z" />
            <path d="M293 276C308 226 295 194 272 163C273 212 286 251 293 276Z" />
          </g>
          <path d="M67 280C116 297 247 297 293 280" stroke="currentColor" strokeWidth="1.5" opacity=".45" />
          <ellipse cx="180" cy="281" rx="105" ry="13" stroke="currentColor" opacity=".2" />
        </svg>
      </div>
    </section>
  );
}
