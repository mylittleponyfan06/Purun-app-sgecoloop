import type { Metadata } from "next";
import CarePageContent from "@/components/CarePageContent";

export const metadata: Metadata = { title: "Care" };

export default function CarePage() {
  return <CarePageContent />;
}
