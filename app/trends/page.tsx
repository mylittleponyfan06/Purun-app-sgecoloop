import type { Metadata } from "next";
import TrendsPageContent from "@/components/TrendsPageContent";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return <TrendsPageContent />;
}
