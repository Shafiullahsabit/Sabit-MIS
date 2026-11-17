"use client";

import {
  Bell,
  ChevronDown,
  Leaf,
  Languages,
  Menu,
  Moon,
  Search,
} from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { navigationGroups } from "@/lib/navigation";

const themes = ["green", "dark"];
const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function Topbar({ onMenuClick }) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  const activeTheme = mounted && theme === "dark" ? "dark" : "green";
  const nextTheme = activeTheme === "dark" ? "green" : "dark";
  const ThemeIcon = activeTheme === "dark" ? Moon : Leaf;
  const activeItem = navigationGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === pathname);
  const pageTitle = activeItem
    ? t(`navigation.${activeItem.key}`)
    : t("navigation.dashboard");

  useEffect(() => {
    if (mounted && !themes.includes(theme)) {
      setTheme("green");
    }
  }, [mounted, setTheme, theme]);

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border bg-surface/95 px-3 shadow-[0_3px_14px_rgba(20,33,25,0.025)] backdrop-blur-xl sm:px-6 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          aria-label={t("common.openNavigation")}
          className="md:hidden"
          onClick={onMenuClick}
          size="icon"
          variant="ghost"
        >
          <Menu size={19} />
        </Button>
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <span className="text-muted-foreground">{t("store.name")}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">
            {pageTitle}
          </span>
        </div>
        <span className="truncate text-sm font-semibold text-foreground sm:hidden">
          {t("store.shortName")}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <label className="relative hidden w-[220px] lg:block xl:w-[270px]">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3"
            size={16}
          />
          <input
            aria-label={t("common.search")}
            className="h-10 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:bg-surface rtl:pl-3 rtl:pr-9"
            placeholder={t("common.searchAnything")}
            type="search"
          />
          <span className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground xl:inline rtl:right-auto rtl:left-2.5">
            ⌘ K
          </span>
        </label>
        <label className="relative flex h-9 items-center">
          <Languages
            aria-hidden="true"
            className="pointer-events-none absolute left-2 text-muted-foreground rtl:left-auto rtl:right-2"
            size={14}
          />
          <select
            aria-label={t("common.language")}
            className="h-9 w-[78px] appearance-none rounded-lg border border-border bg-surface pl-7 pr-2 text-[10px] font-medium text-foreground outline-none focus:border-accent sm:w-[100px] sm:text-xs rtl:pl-2 rtl:pr-7"
            onChange={(event) => setLocale(event.target.value)}
            value={locale}
          >
            <option value="en">English</option>
            <option value="ps">پښتو</option>
            <option value="fa">دری</option>
          </select>
        </label>
        <Button
          aria-label={`${t("common.appearance")}: ${t(`common.${activeTheme}`)}`}
          aria-pressed={activeTheme === "dark"}
          className="text-muted-foreground hover:text-accent"
          disabled={!mounted}
          onClick={() => setTheme(nextTheme)}
          size="icon"
          title={`${t("common.appearance")}: ${t(`common.${activeTheme}`)}`}
          variant="ghost"
        >
          <ThemeIcon size={18} strokeWidth={1.8} />
        </Button>
        <Button
          aria-label={t("common.notifications")}
          className="relative text-muted-foreground"
          size="icon"
          variant="ghost"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-warning ring-2 ring-surface" />
        </Button>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <button
          aria-label={t("common.accountMenu")}
          className="flex items-center gap-2 pl-1"
          type="button"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent sm:h-9 sm:w-9">
            SH
          </span>
          <span className="hidden text-left md:block rtl:text-right">
            <span className="block text-xs font-semibold text-foreground">
              Sabit H.
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {t("common.administrator")}
            </span>
          </span>
          <ChevronDown className="hidden text-muted-foreground md:block" size={14} />
        </button>
      </div>
    </header>
  );
}
