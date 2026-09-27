"use client";

import { useId } from "react";
import { Droplets, Leaf, Sun } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

type TrendPoint = { timestamp: number; value: number };

type HealthTrendChartProps = {
  health: TrendPoint[];
  sunlight: TrendPoint[];
  reservoir: TrendPoint[];
  sunlightWindow: [number, number];
  currentScore: number;
  reservoirLevel: number;
  simulation?: boolean;
};

const timeFormat = new Intl.DateTimeFormat("en-SG", { hour: "numeric", hour12: true, timeZone: "Asia/Singapore" });
const dateFormat = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" });
const tooltipTimeFormat = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Singapore" });

function TrendTooltip({ active, payload, label, unit, name }: TooltipContentProps & { unit: string; name: string }) {
  const value: unknown = payload[0]?.value;
  if (!active || typeof value !== "number" || typeof label !== "number") return null;

  return (
    <div className="trend-tooltip" role="status">
      <p>{tooltipTimeFormat.format(label)} SGT</p>
      <strong>{name}: {value.toLocaleString("en-SG")}{unit}</strong>
    </div>
  );
}

function TrendPlot({ data, name, unit, stroke, fill, domain, ticks, compact = false }: {
  data: TrendPoint[];
  name: string;
  unit: string;
  stroke: string;
  fill: string;
  domain: [number, number];
  ticks: number[];
  compact?: boolean;
}) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 400, height: 200 }}>
      <AreaChart data={data} accessibilityLayer aria-label={`${name}. Use left and right arrow keys to explore readings.`} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.45} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#214d3e12" />
        <XAxis dataKey="timestamp" type="number" domain={domain} ticks={ticks} tickFormatter={(timestamp: number) => compact ? (timestamp === domain[0] ? "24h ago" : "Now") : timeFormat.format(timestamp)} axisLine={false} tickLine={false} tick={{ fill: "#526655", fontSize: 12 }} tickMargin={10} minTickGap={24} interval="preserveStartEnd" height={32} />
        <YAxis domain={[0, unit === " lux" ? 24000 : 100]} ticks={unit === " lux" ? [0, 10000, 20000] : [0, 50, 100]} tickFormatter={(value: number) => unit === " lux" ? `${value / 1000}k` : `${value}`} hide={compact} width={35} axisLine={false} tickLine={false} tick={{ fill: "#526655", fontSize: 12 }} />
        <Tooltip content={(props) => <TrendTooltip {...props} name={name} unit={unit} />} cursor={{ stroke: "#70866a80", strokeDasharray: "3 4" }} isAnimationActive={false} />
        <Area type="monotone" dataKey="value" name={name} stroke={stroke} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={data.length === 1} activeDot={{ r: 5, stroke: "#fffdf5", strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function HealthTrendChart({ health, sunlight, reservoir, sunlightWindow, currentScore, reservoirLevel, simulation = false }: HealthTrendChartProps) {
  const end = health[health.length - 1].timestamp;
  const start = end - 24 * 3600000;
  const timeTicks = [start, start + 6 * 3600000, start + 12 * 3600000, start + 18 * 3600000, end];

  return (
    <div className="trends-grid">
      <section className="trend-card health-trend-card" aria-labelledby="health-trend-heading">
        <div className="trend-card-heading">
          <div><h2 id="health-trend-heading"><Leaf size={20} aria-hidden="true" /> Plant Health</h2><p>{simulation ? "Demo history · newest scores use care rules" : "Last 24 hours · illustrative scores"}</p></div>
          <span className="trend-score" aria-label={`Current score: ${currentScore} out of 100`}>{currentScore}<span>Current</span></span>
        </div>
        <div className="trend-plot health-trend-plot">
          <TrendPlot data={health} name="Plant health" unit=" / 100" stroke="var(--forest-green)" fill="var(--teal-water)" domain={[start, end]} ticks={timeTicks} />
        </div>
        <p className="trend-caption"><span className="trend-key" /> A gentle rhythm, with room to grow.</p>
      </section>

      <div className="trends-side">
        <section className="trend-card sunlight-trend-card" aria-labelledby="sunlight-trend-heading">
          <div className="trend-card-heading">
            <div><h2 id="sunlight-trend-heading"><Sun size={20} aria-hidden="true" /> Sunlight Exposure</h2><p>{simulation ? "Last 24 hours · simulated light · lux" : `${dateFormat.format(sunlightWindow[0])} · morning to evening · lux`}</p></div>
          </div>
          <div className="trend-plot sunlight-trend-plot">
            <TrendPlot data={sunlight} name="Sunlight" unit=" lux" stroke="#a87913" fill="var(--sun-amber)" domain={sunlightWindow} ticks={simulation ? [sunlightWindow[0], sunlightWindow[0] + 12 * 3600000, sunlightWindow[1]] : [sunlightWindow[0], sunlightWindow[0] + 6 * 3600000, sunlightWindow[0] + 12 * 3600000]} />
          </div>
        </section>

        <section className="trend-card reservoir-trend-card" aria-labelledby="reservoir-trend-heading">
          <div className="trend-card-heading">
            <div><h2 id="reservoir-trend-heading"><Droplets size={19} aria-hidden="true" /> Reservoir Level</h2><p>{reservoir[0].value}% → {reservoirLevel}% over 24 hours</p></div>
            <span className="reservoir-value">{reservoirLevel}%</span>
          </div>
          <div className="trend-plot reservoir-trend-plot">
            <TrendPlot data={reservoir} name="Reservoir" unit="%" stroke="var(--teal-water)" fill="var(--teal-water)" domain={[start, end]} ticks={[start, end]} compact />
          </div>
        </section>
      </div>
    </div>
  );
}
