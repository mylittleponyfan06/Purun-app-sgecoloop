"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, HeartPulse, ChartNoAxesCombined, Sprout, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/trends", label: "Trends", icon: ChartNoAxesCombined },
  { href: "/care", label: "Care", icon: Sprout },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="nav-tab" aria-current={pathname === href ? "page" : undefined}>
          <Icon size={23} strokeWidth={1.65} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
