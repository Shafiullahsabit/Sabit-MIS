"use client";

import { ArrowUpRight } from "lucide-react";
import { recentSales } from "@/lib/sample-data";
import { formatAFN, formatTime } from "@/lib/format";
import { useLocale } from "@/components/providers/locale-provider";

export function RecentSales() {
  const { numberLocale, t } = useLocale();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-start">
        <thead>
          <tr className="border-y border-border text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
            <th className="px-6 py-3 font-medium">{t("common.customer")}</th>
            <th className="px-4 py-3 font-medium">{t("common.saleId")}</th>
            <th className="px-4 py-3 font-medium">{t("common.time")}</th>
            <th className="px-4 py-3 text-end font-medium">
              {t("common.amount")}
            </th>
            <th className="px-6 py-3 text-end font-medium">
              {t("common.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {recentSales.map((sale) => (
            <tr
              className="border-b border-border last:border-0"
              key={sale.id}
            >
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
                    {sale.initials}
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-foreground">
                    {t(sale.customerKey)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-[11px] font-medium text-muted-foreground">
                {sale.id}
              </td>
              <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                {formatTime(sale.time, numberLocale)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-end text-xs font-semibold text-foreground">
                {formatAFN(sale.amount, numberLocale)}
              </td>
              <td className="px-6 py-3.5 text-end">
                <span className="inline-flex items-center gap-1 rounded-full bg-positive-soft px-2 py-1 text-[10px] font-medium text-positive">
                  <ArrowUpRight size={11} />
                  {t(sale.statusKey)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
