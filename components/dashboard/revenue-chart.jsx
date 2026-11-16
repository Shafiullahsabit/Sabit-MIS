"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { revenueByPeriod } from "@/lib/sample-data";
import { formatAFN } from "@/lib/format";

const periods = {
  "Last 7 days": "week",
  "This month": "month",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#e8ede7] bg-white px-3 py-2.5 shadow-lg">
      <p className="text-[10px] font-medium text-[#909a92]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[#314c38]">
        {formatAFN(payload[0].value)}
      </p>
    </div>
  );
}

export function RevenueChart() {
  const [period, setPeriod] = useState("Last 7 days");
  const data = revenueByPeriod[periods[period]];
  const totalRevenue = data.reduce((total, point) => total + point.revenue, 0);

  return (
    <Card>
      <CardHeader className="flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#2a392f]">
              Revenue overview
            </h2>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#edf6ed] px-1.5 py-0.5 text-[9px] font-semibold text-[#53865c]">
              <ArrowUpRight size={11} />
              12.8%
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#8c968e]">
            Sales performance across your store
          </p>
        </div>
        <label className="relative flex w-full items-center gap-2 self-start sm:w-auto">
          <CalendarDays
            aria-hidden="true"
            className="pointer-events-none absolute left-3 text-[#87948a]"
            size={14}
          />
          <select
            aria-label="Revenue chart period"
            className="h-9 w-full appearance-none rounded-lg border border-[#e8ede7] bg-white pl-9 pr-8 text-[11px] font-medium text-[#59665d] outline-none focus:border-[#93af98] sm:w-auto"
            onChange={(event) => setPeriod(event.target.value)}
            value={period}
          >
            {Object.keys(periods).map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 text-[10px] text-[#8c968e]">
            ▾
          </span>
        </label>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-1 flex items-baseline gap-2">
          <p className="text-[26px] font-semibold tracking-[-0.04em] text-[#26372c]">
            {formatAFN(totalRevenue)}
          </p>
          <span className="text-[10px] text-[#929c94]">total revenue</span>
        </div>
        <div className="h-[230px] w-full sm:h-[260px]">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={data}
              margin={{ top: 16, right: 4, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#91b792" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#91b792" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#edf0ec"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "#98a199", fontSize: 10 }}
                tickLine={false}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                tick={{ fill: "#98a199", fontSize: 10 }}
                tickLine={false}
                tickMargin={8}
                width={38}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#dce6db" }} />
              <Area
                activeDot={{
                  fill: "#4b7753",
                  r: 4,
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                dataKey="revenue"
                fill="url(#revenueFill)"
                stroke="#638b68"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
