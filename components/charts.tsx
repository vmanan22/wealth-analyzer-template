"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupees } from "@/lib/format";

const colors = ["#286140", "#4177c8", "#d99b2b", "#dc5b4d", "#6f5cc2", "#2f9e95", "#8a6f45", "#758467"];

export function AllocationPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatRupees(Number(value), { compact: true })} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NetWorthLine({ data }: { data: { month: string; netWorth: number; assets: number; liabilities: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatRupees(Number(value), { compact: true })} />
        <Tooltip formatter={(value) => formatRupees(Number(value), { compact: true })} />
        <Legend />
        <Line type="monotone" dataKey="netWorth" stroke="#286140" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="assets" stroke="#4177c8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="liabilities" stroke="#dc5b4d" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GoalBars({ data }: { data: { name: string; progress: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 36 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" />
        <XAxis type="number" domain={[0, 100]} />
        <YAxis type="category" dataKey="name" width={112} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
        <Bar dataKey="progress" fill="#d99b2b" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AssetClassArea({ data }: { data: Record<string, string | number>[] }) {
  const keys = Object.keys(data[0] ?? {}).filter((key) => key !== "month");
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatRupees(Number(value), { compact: true })} />
        <Tooltip formatter={(value) => formatRupees(Number(value), { compact: true })} />
        <Legend />
        {keys.map((key, index) => (
          <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={colors[index % colors.length]} fill={colors[index % colors.length]} fillOpacity={0.75} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
