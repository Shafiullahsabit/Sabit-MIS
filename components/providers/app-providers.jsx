"use client";

import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/components/providers/locale-provider";

export function AppProviders({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="green"
      enableSystem={false}
      themes={["green", "dark"]}
    >
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
