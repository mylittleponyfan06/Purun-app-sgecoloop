import type { LucideIcon } from "lucide-react";

type SensorStatusCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "water" | "sun" | "leaf" | "clay";
  state?: "good" | "watch" | "danger";
};

export default function SensorStatusCard({ title, value, description, icon: Icon, tone, state = "good" }: SensorStatusCardProps) {
  return (
    <article className={`sensor-card ${tone}-card sensor-state-${state}`}>
      <div className="sensor-card-heading">
        <span className="icon-tile"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
        <h3>{title}</h3>
      </div>
      <p className="sensor-value">{value}</p>
      <p className="sensor-description">{description}</p>
    </article>
  );
}
