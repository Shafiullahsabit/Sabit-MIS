"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useLocale } from "@/components/providers/locale-provider";

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-background text-foreground md:pl-[256px] rtl:md:pl-0 rtl:md:pr-[256px]">
      <Sidebar
        isOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
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
