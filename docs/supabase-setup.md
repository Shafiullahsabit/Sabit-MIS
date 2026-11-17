# Supabase setup and employee provisioning

## Requirements and security

- Create a Supabase project and install the Supabase CLI using its official
  installation instructions.
- Apply migrations and seed data before creating Auth users. The Auth trigger
  assigns every new profile the inactive Cashier role and requires the seeded
  `cashier` role to exist.
- Disable public/self-service signups in Supabase Auth. Create staff only by
  an administrator-approved invite or account-creation process.
- Never store passwords in this repository or in the MIS database. Never put a
  Supabase service-role key in browser code, a `NEXT_PUBLIC_*` variable, source
  control, or client logs.

The dashboard reads sales and inventory data from Supabase using the signed-in
employee's session. The POS remains a non-persistent sample-data interface;
other retail modules are not connected to live records yet. Sign-in, invite
acceptance, and administrator-managed employee invitations use Supabase Auth.

## Local Supabase

From the repository root:

```powershell
supabase start
supabase db reset
supabase test db
```

`supabase db reset` recreates the local database, applies all migrations, and
runs `supabase/seed.sql` as configured in `supabase/config.toml`. It deletes
local database data; do not use it as a hosted-project reset command.

## Hosted project

1. Authenticate and link the repository to the intended Supabase project:

   ```powershell
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```
2. Review the linked project and apply versioned migrations:

   ```powershell
   supabase migration list
   supabase db push
   ```
3. Apply `supabase/seed.sql` once using the Supabase Dashboard SQL Editor.
   Hosted `supabase db push` applies migrations; it does not run the local seed
   configuration. The seed contains roles, permissions, payment methods,
   units, expense/product categories, and default store/receipt/system settings.
   It contains no employee accounts or passwords and is safe to rerun.
4. Run `supabase test db` against a local database before production changes.
   For production, use a reviewed deployment process and backup/restore plan;
   never use a database reset command against production.

The schema uses PostgreSQL 15+ view security options. The included local
configuration targets PostgreSQL 15.

## Configure the application

1. Copy `.env.example` to `.env.local` in the repository root and set:
   - `NEXT_PUBLIC_SUPABASE_URL` to the project's API URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable key (or legacy
     anon key). This value is public; database access is controlled by RLS.
   - `SUPABASE_SECRET_KEY` to a server-only Supabase secret key. Keep it out of
     `NEXT_PUBLIC_*` variables, source control, and browser code. It is used
     only by the server to send Auth invitations.
2. In **Authentication → URL Configuration**, set the local Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to the
   allowed redirect URLs. Add the equivalent production callback URL for the
   deployed site. The invitation API passes this callback to Supabase Auth.
3. Configure an email provider suitable for sending staff invitations. Supabase
   project defaults may be rate-limited; configure production SMTP before
   inviting real employees.
4. Keep public/self-service signups disabled. Start the app with `npm run dev`
   and visit `/sign-in`. Do not send credentials or secret keys in chat.
5. Add the same three environment variables in the Vercel project's
   Environment Variables settings. Limit the secret key to the server
   environment(s) that need employee invitations.

## Provision the first four employees

Create four users with Supabase Auth after the seed is applied:

1. In **Authentication → Users**, invite or create two administrator accounts
   and two cashier accounts using the store's approved email/invite process.
   Do not use shared or default passwords. Let each employee establish their
   own credential through Supabase Auth.
2. The database trigger creates each corresponding `profiles` row as an
   **inactive Cashier**. Auth metadata may supply a display name only; it cannot
   grant an administrator role or activate an account.
3. Copy each user's UUID from the Auth Users page. Replace all placeholder UUIDs
   and names below with the four actual employees, then run the block in the
   Dashboard SQL Editor. Do not paste passwords, access tokens, or service-role
   keys into it.

```sql
begin;

do $$
declare
  v_updated integer;
begin
  update public.profiles p
  set role_id = (select id from public.roles where code = 'admin'),
      display_name = 'Admin One',
      employee_code = 'EMP-001',
      preferred_language = 'en',
      is_active = true
  where p.id = '<ADMIN_1_AUTH_USER_UUID>'::uuid
    and exists (select 1 from auth.users u where u.id = p.id);
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Admin 1 profile not found'; end if;

  update public.profiles p
  set role_id = (select id from public.roles where code = 'admin'),
      display_name = 'Admin Two',
      employee_code = 'EMP-002',
      preferred_language = 'en',
      is_active = true
  where p.id = '<ADMIN_2_AUTH_USER_UUID>'::uuid
    and exists (select 1 from auth.users u where u.id = p.id);
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Admin 2 profile not found'; end if;

  update public.profiles p
  set role_id = (select id from public.roles where code = 'cashier'),
      display_name = 'Cashier One',
      employee_code = 'EMP-003',
      preferred_language = 'en',
      is_active = true
  where p.id = '<CASHIER_1_AUTH_USER_UUID>'::uuid
    and exists (select 1 from auth.users u where u.id = p.id);
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Cashier 1 profile not found'; end if;

  update public.profiles p
  set role_id = (select id from public.roles where code = 'cashier'),
      display_name = 'Cashier Two',
      employee_code = 'EMP-004',
      preferred_language = 'en',
      is_active = true
  where p.id = '<CASHIER_2_AUTH_USER_UUID>'::uuid
    and exists (select 1 from auth.users u where u.id = p.id);
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Cashier 2 profile not found'; end if;
end;
$$;

commit;
```

Replace example names and employee codes to match store records. The transaction
aborts if any UUID does not have a profile. Verify the resulting roster:

```sql
select r.code as role, count(*) as active_employees
from public.profiles p
join public.roles r on r.id = p.role_id
where p.is_active
group by r.code
order by r.code;
```

The initial roster should show two active Admins and two active Cashiers. Store
the Auth UUIDs and employee codes in the store's approved personnel system, not
in source control.

## Adding or managing employees after bootstrap

An active administrator with `employees.manage` can invite staff from the
Employees module. The server sends the email invitation using the
`SUPABASE_SECRET_KEY`, then assigns the role, employee details, and active
status by calling `admin_update_employee` with that administrator's
authenticated session. The service key is never sent to the browser or used
for the permission-checked RPC. The employee follows the email link and sets
their own password; `/sign-up` does not allow self-registration.

The RPC prevents an administrator from deactivating or demoting themselves or
removing the last active administrator. Employee passwords, invites, and Auth
email addresses remain in Supabase Auth, not `profiles`.

If the invitation email is sent but profile assignment fails, the new profile
remains inactive as created by the Auth trigger. Review that user in Supabase
before retrying; do not create a second invitation blindly.

## Application integration notes

- Sign-in and employee profile checks use the cookie-backed Supabase SSR
  clients; protected pages verify the Auth user, profile, active status, and
  role.
- The service/secret key is used only for the Auth Admin invitation endpoint.
  Never prefix it with `NEXT_PUBLIC_`.
- Use the user's session for permission-checked RPCs. Do not duplicate sales,
  purchase receiving, inventory adjustment, payment, or return logic in client
  code.
- The dashboard reads sales, sales items, customers, and low-stock data from
  Supabase using the signed-in employee's session and database row-level
  security. The POS remains an explicitly labeled, non-persistent demo until
  its cash-session and sale-completion workflow is connected.
