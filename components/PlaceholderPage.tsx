import Link from "next/link";
import { ArrowLeft, Leaf, type LucideIcon } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description: string;
  heading: string;
  message: string;
  icon: LucideIcon;
  tone: "water" | "sun" | "leaf" | "clay";
};

export default function PlaceholderPage({ title, description, heading, message, icon: Icon, tone }: PlaceholderPageProps) {
  return (
    <div className="page-content placeholder-page">
      <div className="page-topline"><span className="eyebrow">Your little wetland</span><span className="station-tag"><Leaf size={14} aria-hidden="true" /> Room to grow</span></div>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      <section className={`placeholder-panel ${tone}-card`} aria-labelledby="placeholder-heading">
        <span className="placeholder-orbit" aria-hidden="true" />
        <span className="icon-tile"><Icon size={32} strokeWidth={1.5} aria-hidden="true" /></span>
        <span className="eyebrow">Taking root</span>
        <h2 id="placeholder-heading">{heading}</h2>
        <p>{message}</p>
        <span className="placeholder-label">A little space for what’s next</span>
      </section>
      <Link href="/" className="back-link"><ArrowLeft size={17} aria-hidden="true" /> Back to your wetland</Link>
    </div>
  );
}
