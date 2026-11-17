"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatAFN } from "@/lib/format";
import { useLocale } from "@/components/providers/locale-provider";

function ChartTooltip({ active, payload, label }) {
  const { numberLocale } = useLocale();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold text-foreground">
        {formatAFN(payload[0].value, numberLocale)}
      </p>
    </div>
  );
}

export function RevenueChart({ revenueByPeriod, todayDate }) {
  const { numberLocale, t } = useLocale();
  const [period, setPeriod] = useState("week");
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [hourlyRevenue, setHourlyRevenue] = useState({
    date: null,
    points: [],
    status: "idle",
  });

  useEffect(() => {
    if (period !== "day") return undefined;

    const controller = new AbortController();

    async function loadHourlyRevenue() {
      setHourlyRevenue({ date: selectedDate, points: [], status: "loading" });

      try {
        const query = new URLSearchParams({ date: selectedDate });
        const response = await fetch(`/api/dashboard/revenue?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("The daily revenue request failed.");
        }

        const result = await response.json();
        if (!Array.isArray(result.points)) {
          throw new Error("The daily revenue response was invalid.");
        }

        setHourlyRevenue({
          date: selectedDate,
          points: result.points,
          status: "success",
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        setHourlyRevenue({ date: selectedDate, points: [], status: "error" });
      }
    }

    loadHourlyRevenue();
    return () => controller.abort();
  }, [period, selectedDate]);

  const isDailyLoading =
    period === "day" &&
    (hourlyRevenue.date !== selectedDate ||
      hourlyRevenue.status === "idle" ||
      hourlyRevenue.status === "loading");
  const sourceData =
    period === "day"
      ? hourlyRevenue.date === selectedDate &&
        hourlyRevenue.status === "success"
        ? hourlyRevenue.points
        : []
      : revenueByPeriod[period];
  const dateFormatter = new Intl.DateTimeFormat(numberLocale, {
    ...(period === "week"
      ? { weekday: "short" }
      : { day: "numeric", month: "short" }),
    timeZone: "UTC",
  });
  const hourFormatter = new Intl.DateTimeFormat(numberLocale, {
    hour: "numeric",
    timeZone: "UTC",
  });
  const data = sourceData.map((point) => ({
    ...point,
    label:
      period === "day"
        ? hourFormatter.format(new Date(Date.UTC(2020, 0, 1, point.hour)))
        : dateFormatter.format(new Date(`${point.date}T12:00:00Z`)),
  }));
  const totalRevenue = data.reduce((total, point) => total + point.revenue, 0);
  const hasSales = data.some((point) => point.revenue > 0);

  return (
    <Card>
      <CardHeader className="flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("dashboard.revenueOverview")}
          </h2>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("dashboard.salesPerformance")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row">
          <label className="relative flex w-full items-center gap-2 sm:w-auto">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 text-muted-foreground rtl:left-auto rtl:right-3"
              size={14}
            />
            <select
              aria-label={t("dashboard.chartPeriod")}
              className="h-9 w-full appearance-none rounded-lg border border-border bg-surface pl-9 pr-8 text-[11px] font-medium text-foreground outline-none focus:border-accent sm:w-auto rtl:pl-8 rtl:pr-9"
              onChange={(event) => setPeriod(event.target.value)}
              value={period}
            >
              <option value="day">{t("dashboard.dailyView")}</option>
              <option value="week">{t("dashboard.last7Days")}</option>
              <option value="month">{t("dashboard.thisMonth")}</option>
            </select>
            <span className="pointer-events-none absolute right-3 text-[10px] text-muted-foreground rtl:right-auto rtl:left-3">
              ▾
            </span>
          </label>
          {period === "day" ? (
            <label>
              <span className="sr-only">{t("dashboard.selectDate")}</span>
              <input
                aria-label={t("dashboard.selectDate")}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-foreground outline-none focus:border-accent sm:w-[158px] rtl:text-right"
                max={todayDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-1 flex items-baseline gap-2">
          <p className="text-[26px] font-semibold tracking-[-0.04em] text-foreground">
            {isDailyLoading ? "—" : formatAFN(totalRevenue, numberLocale)}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {t("common.totalRevenue")}
          </span>
        </div>
        <div className="h-[230px] w-full sm:h-[260px]">
          {isDailyLoading ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-surface-muted/50 px-4 text-center text-xs text-muted-foreground">
              {t("dashboard.loadingRevenue")}
            </div>
          ) : period === "day" && hourlyRevenue.status === "error" ? (
            <div
              className="flex h-full items-center justify-center rounded-xl bg-surface-muted/50 px-4 text-center text-xs text-muted-foreground"
              role="alert"
            >
              {t("dashboard.revenueLoadError")}
            </div>
          ) : hasSales ? (
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={data}
                margin={{ top: 16, right: 4, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fill: "var(--chart-text)", fontSize: 10 }}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat(numberLocale, {
                      maximumFractionDigits: 0,
                      notation: "compact",
                    }).format(value)
                  }
                  tick={{ fill: "var(--chart-text)", fontSize: 10 }}
                  tickLine={false}
                  tickMargin={8}
                  width={38}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--chart-grid)" }}
                />
                <Area
                  activeDot={{
                    fill: "var(--chart-active)",
                    r: 4,
                    stroke: "var(--surface)",
                    strokeWidth: 2,
                  }}
                  dataKey="revenue"
                  fill="url(#revenueFill)"
                  stroke="var(--chart-line)"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-surface-muted/50 px-4 text-center text-xs text-muted-foreground">
              {t("dashboard.noSalesForPeriod")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
