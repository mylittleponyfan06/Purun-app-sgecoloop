import type { Metadata } from "next";
import AutoReadSettings from "@/components/AutoReadSettings";
import CareAISettings from "@/components/CareAISettings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <div className="page-content"><h1>Your station</h1><p className="page-description">Settle into your own rhythm.</p><CareAISettings /><AutoReadSettings /></div>;
}
