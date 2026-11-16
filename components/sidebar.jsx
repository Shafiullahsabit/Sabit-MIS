"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  Settings2,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navigationGroups } from "@/lib/navigation";

const icons = {
  dashboard: LayoutDashboard,
  pos: CreditCard,
  products: Package,
  inventory: Boxes,
  purchases: ShoppingCart,
  suppliers: Truck,
  customers: Users,
  sales: CircleDollarSign,
  expenses: Wallet,
  reports: ChartNoAxesCombined,
  employees: BriefcaseBusiness,
  settings: Settings2,
};

export function Sidebar({ isOpen, onNavigate, onClose }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-[#18251e] text-white transition-transform duration-200 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-[76px] items-center justify-between border-b border-white/[0.08] px-5">
        <Link
          className="flex items-center gap-3"
          href="/"
          onClick={onNavigate}
          aria-label="Sabit Super Store dashboard"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b7d9a8] text-[#183323]">
            <ShoppingBasket size={21} strokeWidth={2.2} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-bold tracking-[0.12em]">
              SABIT
            </span>
            <span className="mt-1 block text-[10px] font-medium tracking-[0.17em] text-white/55">
              SUPER STORE
            </span>
          </span>
        </Link>
        <Button
          aria-label="Close navigation"
          className="text-white/60 hover:bg-white/10 hover:text-white md:hidden"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X size={18} />
        </Button>
      </div>

      <div className="mx-4 mt-5 flex items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.045] px-3 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#33483a] text-[#c8e0b9]">
          <ShoppingBasket size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">Main branch</span>
          <span className="mt-1 block text-[10px] text-white/50">
            Kabul, Afghanistan
          </span>
        </span>
        <span
          aria-label="Store is open"
          className="h-2 w-2 rounded-full bg-[#9bd286] ring-4 ring-[#9bd286]/10"
        />
      </div>

      <nav
        aria-label="Main navigation"
        className="scrollbar-hidden mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-5"
      >
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = icons[item.key];
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href;

                return (
                  <li key={item.key}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[#d5e8ce] text-[#203c2a] shadow-sm"
                          : "text-white/65 hover:bg-white/[0.07] hover:text-white",
                      )}
                      href={item.href}
                      onClick={onNavigate}
                    >
                      <Icon
                        className={cn(
                          active ? "text-[#315c3c]" : "text-white/50 group-hover:text-white/80",
                        )}
                        size={17}
                        strokeWidth={1.8}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.key === "inventory" ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-[#b8d6ac] text-[#315c3c]"
                              : "bg-[#edb968]/15 text-[#edc487]",
                          )}
                        >
                          12
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] p-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbe9d2] text-xs font-bold text-[#26422f]">
            SH
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">Sabit H.</p>
            <p className="mt-0.5 truncate text-[10px] text-white/45">
              Store administrator
            </p>
          </div>
          <PanelLeftClose className="text-white/35" size={16} />
        </div>
      </div>
    </aside>
  );
}
