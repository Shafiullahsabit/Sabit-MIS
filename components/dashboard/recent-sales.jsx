"use client";

import { AlertCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatAFN, formatTime } from "@/lib/format";
import { useLocale } from "@/components/providers/locale-provider";

const statusStyles = {
  completed: "bg-positive-soft text-positive",
  balanceDue: "bg-warning-soft text-warning",
  partiallyRefunded: "bg-warning-soft text-warning",
  refunded: "bg-surface-muted text-muted-foreground",
  voided: "bg-surface-muted text-muted-foreground",
};

export function RecentSales({ sales, timeZone }) {
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
          {sales.length ? sales.map((sale) => {
            const customerName =
              sale.customerName ??
              (sale.customerId
                ? t("common.customer")
                : t("common.walkInCustomer"));
            const initials = customerName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toLocaleUpperCase();
            const statusClass =
              statusStyles[sale.statusKey] ?? statusStyles.completed;

            return (
              <tr className="border-b border-border last:border-0" key={sale.id}>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
                      {initials}
                    </span>
                    <span className="whitespace-nowrap text-xs font-medium text-foreground">
                      {customerName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[11px] font-medium text-muted-foreground">
                  {sale.id}
                </td>
                <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                  {formatTime(sale.soldAt, numberLocale, timeZone)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-end text-xs font-semibold text-foreground">
                  {formatAFN(sale.amount, numberLocale)}
                </td>
                <td className="px-6 py-3.5 text-end">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${statusClass}`}>
                    {sale.statusKey === "completed" ? (
                      <ArrowUpRight size={11} />
                    ) : sale.statusKey === "balanceDue" ? (
                      <ArrowDownRight size={11} />
                    ) : (
                      <AlertCircle size={11} />
                    )}
                    {t(`dashboard.saleStatuses.${sale.statusKey}`)}
                  </span>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td className="px-6 py-10 text-center text-xs text-muted-foreground" colSpan={5}>
                {t("dashboard.noRecentSales")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
