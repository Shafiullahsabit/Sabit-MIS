# Sabit Super Store MIS

The first phase of a responsive Management Information System for Sabit Super
Store. This release establishes the application foundation, shared navigation,
design system, and a live, permission-filtered dashboard.

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
  formatting, with English, Dari, and Pashto message dictionaries in `messages/`
- **Themes:** Green (default) and Dark appearance modes, using a consistent
  forest-green retail palette
- **Typography:** self-hosted Inter Variable and Noto Sans Arabic Variable for
  English and RTL Dari/Pashto content
- **POS training catalog:** `lib/pos-sample-data.js`, used only by the
  explicitly labeled, non-persistent POS demo
- **Navigation:** `lib/navigation.js`, shared by the sidebar and module routes

The dashboard shows permission-filtered sales summaries, a real revenue chart
with hourly sales for a selected date and daily totals for the current week or
month, recent transactions, best sellers, and low-stock alerts from Supabase.
POS, products, inventory, suppliers, purchases, customers, sales, expenses,
reports, employees, and settings are wired into the navigation.
Employee authentication and administrator-managed invitations are connected
to Supabase. The POS remains a non-persistent training interface until its
cash-session and sale-completion workflow is connected.

## Supabase database

The repository includes a Supabase PostgreSQL schema, migrations, role and
permission seed data, row-level security, and transactional database functions.
The dashboard reads sales and inventory data using the signed-in employee's
Supabase session, so database row-level security controls which records appear.

See [docs/database.md](./docs/database.md) for the schema and relationships and
[docs/supabase-setup.md](./docs/supabase-setup.md) for local/hosted setup,
authentication configuration, and secure employee provisioning. Never commit
credentials or expose a Supabase secret/service-role key to browser code.

To use sign-in locally, copy `.env.example` to `.env.local` and fill in the
Supabase project URL, publishable key, and server-only secret key. Bootstrap
the first active administrator using the database setup instructions; that
administrator can invite other staff from the Employees module.

The Supabase CLI uses `supabase/config.toml` and `supabase/seed.sql`. Use
`supabase db reset` for a local database (migrations and seed), and
`supabase test db` to run the database contract tests.

## Project layout

```text
app/                  App Router pages and global styles
components/
  auth/               Sign-in and invitation acceptance
  dashboard/          Dashboard charts, tables, and module placeholders
  employees/          Employee directory and invitation form
  providers/          Theme and locale providers
  ui/                 Shared UI primitives
lib/                  Navigation, locale config, sample data, formatting
lib/supabase/         Browser, server, and admin Supabase clients
messages/             English, Pashto, and Dari JSON dictionaries
supabase/
  migrations/         PostgreSQL schema, security, and transaction migrations
  tests/              pgTAP database contract tests
docs/                 Database and secure Supabase setup documentation
```
