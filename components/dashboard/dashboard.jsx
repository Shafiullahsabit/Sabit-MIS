"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ReceiptText,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { formatAFN } from "@/lib/format";
import { useLocale } from "@/components/providers/locale-provider";

const statIcons = {
  revenue: CircleDollarSign,
  orders: ShoppingBag,
  average: ReceiptText,
  stock: Boxes,
};

export function Dashboard({
  stats,
  revenueByPeriod,
  recentSales,
  bestSellers,
  lowStockProducts,
  lowStockCount,
  timeZone,
  todayDate,
}) {
  const { numberLocale, t } = useLocale();

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="text-accent" size={13} />
            {t("dashboard.todayOverview")}
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-foreground sm:text-[30px]">
            {t("dashboard.greeting")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("dashboard.welcome")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="w-full sm:w-auto" variant="outline">
            <Link href="/reports">
              <ReceiptText size={15} />
              {t("dashboard.todaySummary")}
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/pos">
              <ShoppingBag size={15} />
              {t("dashboard.newSale")}
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-label={t("dashboard.keyMetrics")}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = statIcons[stat.key];
          const neutral = stat.key !== "stock" && stat.trend === null;
          const positive =
            stat.key === "stock"
              ? stat.value === 0
              : stat.trend !== null && stat.trend >= 0;

          return (
            <Card className="overflow-hidden" key={stat.key}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t(`dashboard.${stat.key}`)}
                    </p>
                    <p className="mt-3 text-[25px] font-semibold tracking-[-0.04em] text-foreground">
                      {stat.value === null
                        ? "—"
                        : stat.key === "revenue" || stat.key === "average"
                          ? formatAFN(stat.value, numberLocale)
                          : stat.value.toLocaleString(numberLocale)}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span
                    className={
                      neutral
                        ? "inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground"
                        : positive
                        ? "inline-flex items-center gap-0.5 text-[11px] font-semibold text-positive"
                        : "inline-flex items-center gap-0.5 text-[11px] font-semibold text-warning"
                    }
                  >
                    {stat.trend !== null ? (
                      positive ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )
                    ) : null}
                    {stat.key === "stock"
                      ? stat.value === null
                        ? t("dashboard.inventoryUnavailable")
                        : stat.value > 0
                          ? `${stat.value.toLocaleString(numberLocale)} ${t("dashboard.needAttention")}`
                          : t("dashboard.noLowStock")
                      : stat.trend === null
                        ? t("dashboard.noComparison")
                        : new Intl.NumberFormat(numberLocale, {
                            maximumFractionDigits: 1,
                            style: "percent",
                          }).format(stat.trend)}
                  </span>
                  {stat.key !== "stock" && stat.trend !== null ? (
                    <span className="text-[11px] text-muted-foreground">
                      {t("dashboard.vsYesterday")}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-label={t("dashboard.salesOverview")}>
        <RevenueChart revenueByPeriod={revenueByPeriod} todayDate={todayDate} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("dashboard.recentSales")}
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("dashboard.latestTransactions")}
              </p>
            </div>
            <Button asChild className="px-2.5 text-xs" variant="ghost">
              <Link href="/sales">
                {t("common.viewAll")}
                <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-1">
            <RecentSales sales={recentSales} timeZone={timeZone} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("dashboard.bestSellers")}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("dashboard.topProductsThisWeek")}
                </p>
              </div>
              <Button
                aria-label={t("common.moreBestSellerOptions")}
                size="icon"
                variant="ghost"
              >
                <span className="text-lg leading-none">···</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
              {bestSellers.length ? bestSellers.map((product, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg px-1 py-2.5"
                  key={product.name}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">
                    {product.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {product.units.toLocaleString(numberLocale)}{" "}
                      {t("common.unitsSold")}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    #{(index + 1).toLocaleString(numberLocale)}
                  </span>
                </div>
              )) : (
                <p className="px-1 py-5 text-xs text-muted-foreground">
                  {t("dashboard.noBestSellers")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("dashboard.lowStockAlert")}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("dashboard.itemsMayRestock")}
                </p>
              </div>
              <span className="rounded-full bg-warning-soft px-2 py-1 text-[10px] font-semibold text-warning">
                {lowStockCount === null
                  ? "—"
                  : `${lowStockCount.toLocaleString(numberLocale)} ${t("common.items")}`}
              </span>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
              {lowStockProducts === null ? (
                <p className="py-4 text-xs text-muted-foreground">
                  {t("dashboard.inventoryUnavailable")}
                </p>
              ) : lowStockProducts.length ? (
                lowStockProducts.map((product) => (
                  <div
                    className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-0"
                    key={product.sku}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {product.sku}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-warning-soft px-2 py-1 text-[10px] font-semibold text-warning">
                      {product.quantityOnHand.toLocaleString(numberLocale)}{" "}
                      {t("common.left")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-xs text-muted-foreground">
                  {t("dashboard.noLowStock")}
                </p>
              )}
              <Button
                asChild
                className="mt-1 w-full justify-between px-1"
                variant="ghost"
              >
                <Link href="/inventory">
                  {t("dashboard.reviewInventory")}
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
