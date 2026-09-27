import Link from "next/link";
import { Leaf, Sun } from "lucide-react";
import type { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="Purun Care home">
          <span className="brand-name">Purun<Sun aria-hidden="true" /></span>
          <span className="brand-subtitle">Smart Wetland-Care Station</span>
        </Link>
        <div className="header-status">
          <span className="live-status"><span className="status-dot" />Auto-read <span aria-hidden="true">•</span> Live</span>
          <span className="preview-label">Static preview</span>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="station-footer">
        <span><Leaf size={14} aria-hidden="true" /> Small acts. Greener tomorrows.</span>
        <span>Rooted in Singapore</span>
      </footer>
      <BottomNav />
    </div>
  );
}
