# Sabit Super Store MIS

The first phase of a responsive Management Information System for Sabit Super
Store. This release establishes the application foundation, shared navigation,
design system, and an at-a-glance dashboard using realistic sample data.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run a production build with `npm run build`, then serve it locally with
`npm start`. Use `npm run lint` to check the source.

## Foundation

- **Framework:** Next.js App Router with JavaScript and JSX
- **Styles and UI:** Tailwind CSS and reusable shadcn/ui-style primitives
- **Charts and icons:** Recharts and Lucide React
- **Currency:** AFN, formatted centrally in `lib/format.js`
- **Localization foundation:** one document locale and centralized number
  formatting, ready for future English, Dari, and Pashto language resources
- **Initial data:** `lib/sample-data.js`, kept separate from presentation
- **Navigation:** `lib/navigation.js`, shared by the sidebar and module routes

The dashboard includes sales summaries, a period-selectable revenue chart,
recent transactions, best sellers, and low-stock alerts. POS, products,
inventory, suppliers, purchases, customers, sales, expenses, reports, employees,
and settings are wired into the navigation as clearly marked placeholders; no
business workflows or persistence are implemented in this phase.

## Supabase integration

The dashboard currently reads from the sample-data module and does not require
credentials. In a later phase, replace or adapt that data boundary with
server-side Supabase queries and add Supabase Auth, PostgreSQL migrations, and
row-level security policies. Do not commit project secrets; use local
environment variables and Vercel environment settings when integration begins.

## Project layout

```text
app/                  App Router pages and global styles
components/
  dashboard/          Dashboard charts, tables, and module placeholders
  ui/                 Shared UI primitives
lib/                  Navigation, sample data, formatting, and helpers
```
