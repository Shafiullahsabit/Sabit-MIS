"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e9ede8] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          aria-label="Open navigation"
          className="md:hidden"
          onClick={onMenuClick}
          size="icon"
          variant="ghost"
        >
          <Menu size={19} />
        </Button>
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <span className="text-[#909a92]">Sabit Super Store</span>
          <span className="text-[#c1c8c1]">/</span>
          <span className="font-semibold text-[#27352c]">Overview</span>
        </div>
        <span className="truncate text-sm font-semibold sm:hidden">
          Sabit Super Store
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <label className="relative hidden w-[220px] lg:block xl:w-[270px]">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a199]"
            size={16}
          />
          <input
            aria-label="Search"
            className="h-10 w-full rounded-lg border border-[#e7ebe6] bg-[#f8faf8] pl-9 pr-3 text-xs outline-none transition placeholder:text-[#9ba49d] focus:border-[#9bb69e] focus:bg-white"
            placeholder="Search anything..."
            type="search"
          />
          <span className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-[#e1e6e1] px-1.5 py-0.5 text-[9px] text-[#9ba49d] xl:inline">
            ⌘ K
          </span>
        </label>
        <Button
          aria-label="Notifications"
          className="relative text-[#667168]"
          size="icon"
          variant="ghost"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-[#d79545] ring-2 ring-white" />
        </Button>
        <div className="hidden h-8 w-px bg-[#e9ede8] sm:block" />
        <button
          aria-label="Open account menu"
          className="flex items-center gap-2"
          type="button"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2ecdc] text-[11px] font-bold text-[#31563a]">
            SH
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-xs font-semibold text-[#2d3b31]">
              Sabit H.
            </span>
            <span className="mt-0.5 block text-[10px] text-[#929c94]">
              Administrator
            </span>
          </span>
          <ChevronDown className="hidden text-[#98a199] md:block" size={14} />
        </button>
      </div>
    </header>
  );
}
