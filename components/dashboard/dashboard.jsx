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
import { bestSellers, dashboardStats, lowStockProducts } from "@/lib/sample-data";
import { formatAFN } from "@/lib/format";

const statIcons = {
  revenue: CircleDollarSign,
  orders: ShoppingBag,
  average: ReceiptText,
  stock: Boxes,
};

export function Dashboard() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#78847a]">
            <Sparkles className="text-[#8da47e]" size={13} />
            Monday, November 16, 2026
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-[#233329] sm:text-[30px]">
            Good morning, Sabit
          </h1>
          <p className="mt-1.5 text-sm text-[#7b867d]">
            Here&apos;s what&apos;s happening at your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="w-full sm:w-auto" variant="outline">
            <Link href="/reports">
              <ReceiptText size={15} />
              Today&apos;s summary
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/pos">
              <ShoppingBag size={15} />
              New sale
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-label="Key store metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {dashboardStats.map((stat) => {
          const Icon = statIcons[stat.key];
          const positive = stat.trendDirection === "up";

          return (
            <Card className="overflow-hidden" key={stat.key}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#7c887e]">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-[25px] font-semibold tracking-[-0.04em] text-[#25352a]">
                      {stat.key === "revenue" || stat.key === "average"
                        ? formatAFN(stat.value)
                        : stat.value.toLocaleString("en-US")}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ed] text-[#557d5b]">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span
                    className={
                      positive
                        ? "inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#468453]"
                        : "inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#ba7953]"
                    }
                  >
                    {positive ? (
                      <ArrowUpRight size={13} />
                    ) : (
                      <ArrowDownRight size={13} />
                    )}
                    {stat.trend}
                  </span>
                  <span className="text-[11px] text-[#9aa39b]">
                    {stat.comparison || "vs. yesterday"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-label="Sales overview">
        <RevenueChart />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#2a392f]">
                Recent sales
              </h2>
              <p className="mt-1 text-[11px] text-[#8c968e]">
                Latest transactions from your store
              </p>
            </div>
            <Button asChild className="px-2.5 text-xs" variant="ghost">
              <Link href="/sales">
                View all
                <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-1">
            <RecentSales />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <h2 className="text-sm font-semibold text-[#2a392f]">
                  Best sellers
                </h2>
                <p className="mt-1 text-[11px] text-[#8c968e]">
                  Top products this week
                </p>
              </div>
              <Button aria-label="More best seller options" size="icon" variant="ghost">
                <span className="text-lg leading-none">···</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
              {bestSellers.map((product, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg px-1 py-2.5"
                  key={product.name}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4ee] text-xs font-semibold text-[#617760]">
                    {product.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#36443a]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] text-[#98a199]">
                      {product.units} units sold
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#415849]">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <h2 className="text-sm font-semibold text-[#2a392f]">
                  Low stock alert
                </h2>
                <p className="mt-1 text-[11px] text-[#8c968e]">
                  Items that may need restocking
                </p>
              </div>
              <span className="rounded-full bg-[#fff4e6] px-2 py-1 text-[10px] font-semibold text-[#b77d35]">
                12 items
              </span>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
              {lowStockProducts.map((product) => (
                <div
                  className="flex items-center justify-between gap-3 border-t border-[#f0f2ef] py-2.5 first:border-0"
                  key={product.name}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#36443a]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] text-[#98a199]">
                      {product.category}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#fff4e6] px-2 py-1 text-[10px] font-semibold text-[#b77d35]">
                    {product.stock} left
                  </span>
                </div>
              ))}
              <Button
                asChild
                className="mt-1 w-full justify-between px-1"
                variant="ghost"
              >
                <Link href="/inventory">
                  Review inventory
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
