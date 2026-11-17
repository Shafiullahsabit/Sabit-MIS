"use client";

import { Languages, Leaf, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function AuthPageShell({ children }) {
  const { locale, setLocale, t } = useLocale();
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const isDark = mounted && theme === "dark";
  const ThemeIcon = isDark ? Moon : Leaf;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <span className="text-sm font-bold tracking-[0.14em]">
          SABIT <span className="font-medium text-muted-foreground">MIS</span>
        </span>
        <div className="flex items-center gap-2">
          <label className="relative flex h-9 items-center">
            <Languages
              aria-hidden="true"
              className="pointer-events-none absolute left-2 text-muted-foreground rtl:left-auto rtl:right-2"
              size={14}
            />
            <select
              aria-label={t("common.language")}
              className="h-9 w-[104px] appearance-none rounded-lg border border-border bg-surface pl-7 pr-2 text-xs text-foreground outline-none focus:border-accent rtl:pl-2 rtl:pr-7"
              onChange={(event) => setLocale(event.target.value)}
              value={locale}
            >
              <option value="en">English</option>
              <option value="ps">پښتو</option>
              <option value="fa">دری</option>
            </select>
          </label>
          <Button
            aria-label={`${t("common.appearance")}: ${t(
              isDark ? "common.dark" : "common.green",
            )}`}
            disabled={!mounted}
            onClick={() => setTheme(isDark ? "green" : "dark")}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ThemeIcon size={17} />
          </Button>
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center py-10">
        <section className="w-full rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
