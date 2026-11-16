import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Sabit Super Store | Management Information System",
  description:
    "A clear, practical overview of sales, inventory, and store performance at Sabit Super Store.",
};

export default function RootLayout({ children }) {
  return (
    <html dir="ltr" lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
