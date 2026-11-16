import { ArrowUpRight } from "lucide-react";
import { recentSales } from "@/lib/sample-data";
import { formatAFN } from "@/lib/format";

export function RecentSales() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-y border-[#f0f2ef] text-[10px] font-medium uppercase tracking-[0.07em] text-[#9aa39b]">
            <th className="px-6 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Sale ID</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-6 py-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {recentSales.map((sale) => (
            <tr
              className="border-b border-[#f2f4f1] last:border-0"
              key={sale.id}
            >
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2e9] text-[9px] font-semibold text-[#587058]">
                    {sale.initials}
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-[#344239]">
                    {sale.customer}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-[11px] font-medium text-[#78847a]">
                {sale.id}
              </td>
              <td className="px-4 py-3.5 text-[11px] text-[#879188]">
                {sale.time}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold text-[#344239]">
                {formatAFN(sale.amount)}
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6ed] px-2 py-1 text-[10px] font-medium text-[#55815a]">
                  <ArrowUpRight size={11} />
                  {sale.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
