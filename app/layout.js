import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata = {
  applicationName: "Sabit Super Store",
  title: "Sabit Super Store | Management Information System",
  description:
    "A clear, practical overview of sales, inventory, and store performance at Sabit Super Store.",
};

export default function RootLayout({ children }) {
  return (
    <html dir="ltr" lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
