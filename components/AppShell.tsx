import Link from "next/link";
import { connection } from "next/server";
import { Leaf, Sun } from "lucide-react";
import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import OutdoorPulseProvider from "./OutdoorPulseProvider";
import SimulationModal, { SimulationModeLabel } from "./SimulationModal";
import AutoReadProvider, { AutoReadStatus } from "./AutoReadProvider";
import CareAIProvider from "./CareAIProvider";
import PlantChat from "./PlantChat";
import { getAIConfiguration } from "@/lib/ai-config";

export default async function AppShell({ children }: { children: ReactNode }) {
  await connection(); // Read the server feature flag at runtime, not at build time.
  return (
    <CareAIProvider config={getAIConfiguration()}><AutoReadProvider><div className="app-canvas">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="Purun Loop home">
          <span className="brand-name">Purun Loop<Sun aria-hidden="true" /></span>
          <span className="brand-subtitle">Smart Wetland-Care Station</span>
        </Link>
        <div className="header-tools">
          <div className="header-status">
            <AutoReadStatus compact />
            <SimulationModeLabel />
          </div>
          <PlantChat />
        </div>
      </header>
      <OutdoorPulseProvider>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="station-footer">
          <span><Leaf size={14} aria-hidden="true" /> Small acts. Greener tomorrows.</span>
          <span>Rooted in Singapore</span>
        </footer>
        <BottomNav />
      </OutdoorPulseProvider>
      <SimulationModal />
    </div></AutoReadProvider></CareAIProvider>
  );
}
