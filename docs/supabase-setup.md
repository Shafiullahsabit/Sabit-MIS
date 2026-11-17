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

The current Next.js interface still uses sample data. This guide provisions the
database and Auth accounts; it does not connect the frontend or implement POS
screens.

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

For a new employee, a trusted server-side route or operator should invite the
user through the Supabase Auth Admin API using a server-only service-role key.
The Auth trigger creates an inactive Cashier profile. An authorized Admin then
calls `admin_update_employee` through the Admin's authenticated user session to
set the role, employee fields, and active state. If a server route proxies the
RPC, it must forward/verify the requesting Admin's user JWT; calling the RPC
with only a service-role token has no employee identity and is not an
administrator action.

The RPC prevents an administrator from deactivating or demoting themselves or
removing the last active administrator. Employee passwords, invites, and Auth
email addresses remain in Supabase Auth, not `profiles`.

## Application integration notes

When application integration is implemented:

- The Supabase project URL and publishable/anon key may be used by the browser;
  RLS remains the security boundary.
- The service-role key belongs only in a server-side secret store (for example,
  a protected deployment environment variable). Never prefix it with
  `NEXT_PUBLIC_`.
- Use the user's session for permission-checked RPCs. Do not duplicate sales,
  purchase receiving, inventory adjustment, payment, or return logic in client
  code.
- The dashboard currently reads `lib/sample-data.js`; adding a client library,
  auth screens, or live queries is outside this database implementation.
