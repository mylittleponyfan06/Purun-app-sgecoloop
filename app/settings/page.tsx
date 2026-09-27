import type { Metadata } from "next";
import { Settings } from "lucide-react";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <PlaceholderPage title="Your station" description="A little wetland that feels right at home." heading="Settle into your own rhythm." message="Station preferences and reading schedules will belong here. There’s nothing to configure in this preview." icon={Settings} tone="clay" />;
}
