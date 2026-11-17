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
  formatting, with English, Dari, and Pashto message dictionaries in `messages/`
- **Themes:** Green (default) and Dark appearance modes, using a consistent
  forest-green retail palette
- **Typography:** self-hosted Inter Variable and Noto Sans Arabic Variable for
  English and RTL Dari/Pashto content
- **Initial data:** `lib/sample-data.js`, kept separate from presentation
- **Navigation:** `lib/navigation.js`, shared by the sidebar and module routes

The dashboard includes sales summaries, a period-selectable revenue chart,
recent transactions, best sellers, and low-stock alerts. POS, products,
inventory, suppliers, purchases, customers, sales, expenses, reports, employees,
and settings are wired into the navigation as clearly marked placeholders; no
business workflows or persistence are implemented in this phase.

## Supabase database

The repository includes a Supabase PostgreSQL schema, migrations, role and
permission seed data, row-level security, and transactional database functions.
The current dashboard still reads from `lib/sample-data.js`; application
authentication, data fetching, and POS workflows are not connected in this
database phase.

See [docs/database.md](./docs/database.md) for the schema and relationships and
[docs/supabase-setup.md](./docs/supabase-setup.md) for local/hosted setup and
secure provisioning of the first two administrators and two cashiers. Never
commit credentials or expose a Supabase service-role key to browser code.

The Supabase CLI uses `supabase/config.toml` and `supabase/seed.sql`. Use
`supabase db reset` for a local database (migrations and seed), and
`supabase test db` to run the database contract tests.

## Project layout

```text
app/                  App Router pages and global styles
components/
  dashboard/          Dashboard charts, tables, and module placeholders
  providers/          Theme and locale providers
  ui/                 Shared UI primitives
lib/                  Navigation, locale config, sample data, formatting
messages/             English, Pashto, and Dari JSON dictionaries
supabase/
  migrations/         PostgreSQL schema, security, and transaction migrations
  tests/              pgTAP database contract tests
docs/                 Database and secure Supabase setup documentation
```
