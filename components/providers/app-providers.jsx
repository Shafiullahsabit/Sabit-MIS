"use client";

import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/components/providers/locale-provider";

export function AppProviders({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
