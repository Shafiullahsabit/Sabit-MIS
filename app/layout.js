import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata = {
  title: "Sabit Super Store | Management Information System",
  description:
    "A clear, practical overview of sales, inventory, and store performance at Sabit Super Store.",
};

export default function RootLayout({ children }) {
  return (
    <html dir="ltr" lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
