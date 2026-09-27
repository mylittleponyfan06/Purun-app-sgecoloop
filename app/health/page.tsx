import type { Metadata } from "next";
import HealthPageContent from "@/components/HealthPageContent";

export const metadata: Metadata = { title: "Health" };

export default function HealthPage() {
  return <HealthPageContent />;
}
