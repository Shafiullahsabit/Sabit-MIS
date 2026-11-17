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
  PanelLeftOpen,
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
import { useLocale } from "@/components/providers/locale-provider";

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

export function Sidebar({
  isOpen,
  isCollapsed,
  onNavigate,
  onClose,
  onToggleCollapse,
}) {
  const pathname = usePathname();
  const { numberLocale, t } = useLocale();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-[8px_0_32px_rgba(15,35,25,0.08)] transition-[width,transform] duration-300 ease-out md:translate-x-0 md:rtl:translate-x-0 rtl:left-auto rtl:right-0 rtl:shadow-[-8px_0_32px_rgba(15,35,25,0.08)]",
        isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        isCollapsed ? "md:w-[84px]" : "md:w-[256px]",
      )}
    >
      <div
        className={cn(
          "flex h-[76px] shrink-0 items-center justify-between border-b border-sidebar-border px-5",
          isCollapsed && "md:px-1",
        )}
      >
        <Link
          className={cn(
            "flex min-w-0 items-center gap-3",
            isCollapsed && "md:justify-center md:gap-0",
          )}
          href="/"
          onClick={onNavigate}
          aria-label={t("common.dashboardHome")}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d7e9c9] text-[#183b2c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
            <ShoppingBasket size={21} strokeWidth={2} />
          </span>
          <span className={cn("leading-tight", isCollapsed && "md:hidden")}>
            <span className="block text-[13px] font-bold tracking-[0.12em]">
              SABIT
            </span>
            <span className="mt-1 block text-[10px] font-medium tracking-[0.17em] text-sidebar-muted">
              {t("store.brand")}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={t(
              isCollapsed
                ? "common.expandSidebar"
                : "common.collapseSidebar",
            )}
            className="hidden text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground md:inline-flex"
            onClick={onToggleCollapse}
            size="icon"
            title={t(
              isCollapsed
                ? "common.expandSidebar"
                : "common.collapseSidebar",
            )}
            variant="ghost"
          >
            {isCollapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </Button>
          <Button
            aria-label={t("common.closeNavigation")}
            className="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground md:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "mx-4 mt-5 flex shrink-0 items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-card px-3 py-3",
          isCollapsed && "md:mx-2 md:justify-center md:px-0",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-icon text-sidebar-icon-foreground">
          <ShoppingBasket size={17} />
        </span>
        <span className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
          <span className="block truncate text-xs font-semibold">
            {t("common.mainBranch")}
          </span>
          <span className="mt-1 block text-[10px] text-sidebar-muted">
            {t("store.location")}
          </span>
        </span>
        <span
          aria-label="Store is open"
          className={cn(
            "h-2 w-2 shrink-0 rounded-full bg-[#9bd286] ring-4 ring-[#9bd286]/10",
            isCollapsed && "md:hidden",
          )}
        />
      </div>

      <nav
        aria-label={t("common.mainNavigation")}
        className="scrollbar-hidden mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-5"
      >
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p
              className={cn(
                "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted",
                isCollapsed && "md:sr-only",
              )}
            >
              {t(`navigation.groups.${group.key}`)}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = icons[item.key];
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href;
                const label = t(`navigation.${item.key}`);

                return (
                  <li key={item.key}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:content-[''] rtl:before:left-auto rtl:before:right-0",
                        active
                          ? "bg-sidebar-active text-sidebar-active-foreground shadow-sm before:bg-sidebar-indicator"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground before:bg-transparent",
                        isCollapsed && "md:justify-center md:px-0",
                      )}
                      href={item.href}
                      onClick={onNavigate}
                      title={isCollapsed ? label : undefined}
                    >
                      <Icon
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-sidebar-indicator"
                            : "text-sidebar-icon-muted group-hover:text-sidebar-foreground",
                        )}
                        size={17}
                        strokeWidth={1.8}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          isCollapsed && "md:hidden",
                        )}
                      >
                        {label}
                      </span>
                      {item.key === "inventory" ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-sidebar-badge-active text-sidebar-active-foreground"
                              : "bg-[#edb968]/15 text-[#edc487]",
                            isCollapsed && "md:hidden",
                          )}
                        >
                          {new Intl.NumberFormat(numberLocale).format(12)}
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

      <div className="shrink-0 border-t border-sidebar-border p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2",
            isCollapsed && "md:justify-center md:px-0",
          )}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7e9c9] text-xs font-bold text-[#26422f]">
            SH
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-[#9bd286]" />
          </div>
          <div className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
            <p className="truncate text-xs font-semibold">Sabit H.</p>
            <p className="mt-0.5 truncate text-[10px] text-sidebar-muted">
              {t("common.storeAdministrator")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
