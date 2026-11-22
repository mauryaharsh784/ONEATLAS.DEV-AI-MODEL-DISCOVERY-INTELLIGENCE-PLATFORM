"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Recharts wrappers themed with the design tokens (--chart-1…5). All data comes from server components / the database. */
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--muted-foreground)" }, cursor: { fill: "var(--accent)", opacity: 0.5 },
} as const;

export function DonutChart({ data, height = 190 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: height, height }} className="shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...tip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{d.name}</span>
            <span className="num ml-auto text-muted-foreground">{d.value} <span className="text-xs">({Math.round((d.value / total) * 100)}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColumnChart({ data, xKey, yKey, height = 200, color = "var(--chart-1)", yLabel, rotate = false }: { data: Record<string, string | number>[]; xKey: string; yKey: string; height?: number; color?: string; yLabel?: string; rotate?: boolean }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: rotate ? 12 : 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} interval={0} {...(rotate ? { angle: -40, textAnchor: "end", height: 46 } : {})} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip {...tip} formatter={(v) => [v as number, yLabel ?? yKey]} />
          <Bar isAnimationActive={false} dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, labelKey, valueKey, height, unit = "", color = "var(--chart-1)", labelWidth = 120 }: { data: Record<string, string | number>[]; labelKey: string; valueKey: string; height?: number; unit?: string; color?: string; labelWidth?: number }) {
  return (
    <div style={{ height: height ?? Math.max(120, data.length * 28 + 20) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey={labelKey} {...axis} width={labelWidth} interval={0} />
          <Tooltip {...tip} formatter={(v) => [`${v}${unit ? ` ${unit}` : ""}`, ""]} />
          <Bar isAnimationActive={false} dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBarChart({ data, keys, xKey = "model", height = 320 }: { data: Record<string, string | number>[]; keys: { slug: string; label: string }[]; xKey?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} interval={0} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <YAxis {...axis} domain={[0, 100]} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => <Bar key={k.slug} isAnimationActive={false} dataKey={k.slug} name={k.label} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={14} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
