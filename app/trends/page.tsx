import type { Metadata } from "next";
import { ChartNoAxesCombined } from "lucide-react";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return <PlaceholderPage title="Natural rhythms" description="Every little wetland has a story to tell." heading="Good things grow with time." message="Your Purun’s patterns and past readings will find a home here. For now, this space is ready for its first chapter." icon={ChartNoAxesCombined} tone="sun" />;
}
