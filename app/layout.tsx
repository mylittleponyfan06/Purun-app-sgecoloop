import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import Loading from "./loading";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Purun Loop", template: "%s | Purun Loop" },
  description: "A little care for a thriving wetland. Purun Loop, your smart wetland-care station.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f5e9",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<Loading />}><AppShell>{children}</AppShell></Suspense>
      </body>
    </html>
  );
}
