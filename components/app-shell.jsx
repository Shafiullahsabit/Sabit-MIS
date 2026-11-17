"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground transition-[padding] duration-300",
        sidebarCollapsed
          ? "md:pl-[84px] rtl:md:pl-0 rtl:md:pr-[84px]"
          : "md:pl-[256px] rtl:md:pl-0 rtl:md:pr-[256px]",
      )}
    >
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      {sidebarOpen ? (
        <button
          aria-label={t("common.closeNavigation")}
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <div className="min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-6 lg:px-9 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
