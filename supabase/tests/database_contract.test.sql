begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public', 'roles', 'roles table exists');
select has_table('public', 'permissions', 'permissions table exists');
select has_table('public', 'role_permissions', 'role_permissions table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'store_settings', 'store_settings table exists');
select has_table('public', 'system_settings', 'system_settings table exists');
select has_table('public', 'payment_methods', 'payment_methods table exists');
select has_table('public', 'receipt_settings', 'receipt_settings table exists');
select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'brands', 'brands table exists');
select has_table('public', 'units', 'units table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'product_barcodes', 'product_barcodes table exists');
select has_table('public', 'product_translations', 'product_translations table exists');
select has_table('public', 'inventory', 'inventory table exists');
select has_table('public', 'product_batches', 'product_batches table exists');
select has_table('public', 'stock_movements', 'stock_movements table exists');
select has_table('public', 'suppliers', 'suppliers table exists');
select has_table('public', 'purchases', 'purchases table exists');
select has_table('public', 'purchase_items', 'purchase_items table exists');
select has_table('public', 'purchase_receipts', 'purchase_receipts table exists');
select has_table('public', 'purchase_receipt_items', 'purchase_receipt_items table exists');
select has_table('public', 'purchase_payments', 'purchase_payments table exists');
select has_table('public', 'customers', 'customers table exists');
select has_table('public', 'customer_transactions', 'customer_transactions table exists');
select has_table('public', 'cash_sessions', 'cash_sessions table exists');
select has_table('public', 'sales', 'sales table exists');
select has_table('public', 'sale_items', 'sale_items table exists');
select has_table('public', 'sale_payments', 'sale_payments table exists');
select has_table('public', 'expense_categories', 'expense_categories table exists');
select has_table('public', 'expenses', 'expenses table exists');
select has_table('public', 'monthly_budgets', 'monthly_budgets table exists');
select has_table('public', 'monthly_budget_items', 'monthly_budget_items table exists');
select has_table('public', 'sales_returns', 'sales_returns table exists');
select has_table('public', 'sales_return_items', 'sales_return_items table exists');
select has_table('public', 'activity_logs', 'activity_logs table exists');
select has_table('public', 'notifications', 'notifications table exists');

select ok(
  to_regclass('auth.users') is not null
    and exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.profiles'::regclass
        and c.confrelid = 'auth.users'::regclass
        and c.contype = 'f'
    ),
  'profiles are linked to Supabase Auth users'
);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from unnest(array[
      'roles', 'permissions', 'role_permissions', 'profiles',
      'store_settings', 'system_settings', 'payment_methods', 'receipt_settings',
      'categories', 'brands', 'units', 'products', 'product_barcodes',
      'product_translations', 'inventory', 'product_batches', 'stock_movements',
      'suppliers', 'purchases', 'purchase_items', 'purchase_receipts',
      'purchase_receipt_items', 'purchase_payments', 'customers',
      'customer_transactions', 'cash_sessions', 'sales', 'sale_items',
      'sale_payments', 'expense_categories', 'expenses', 'monthly_budgets',
      'monthly_budget_items', 'sales_returns', 'sales_return_items',
      'activity_logs', 'notifications'
    ]) as required(table_name)
    join pg_class c on c.relname = required.table_name
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  'RLS is enabled on every application table'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.monthly_budgets'::regclass
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by a.attname)
        from unnest(c.conkey) as key(attnum)
        join pg_attribute a
          on a.attrelid = c.conrelid and a.attnum = key.attnum
      ) = array['budget_month', 'budget_year']
  ),
  'only one budget can exist for a month and year'
);

select ok(
  (select count(*) = 2 from public.roles where code in ('admin', 'cashier'))
    and not exists (
      select 1
      from public.permissions p
      cross join public.roles r
      left join public.role_permissions rp
        on rp.role_id = r.id and rp.permission_code = p.code
      where r.code = 'admin' and rp.permission_code is null
    )
    and exists (
      select 1
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      where r.code = 'cashier' and rp.permission_code = 'sales.create'
    )
    and not exists (
      select 1
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      where r.code = 'cashier'
        and rp.permission_code in ('employees.manage', 'settings.manage')
    ),
  'seed data creates Admin and Cashier roles with least-privilege permissions'
);

select ok(
  not has_column_privilege('authenticated', 'public.products', 'purchase_price', 'SELECT')
    and not has_column_privilege('authenticated', 'public.products', 'average_cost', 'SELECT')
    and not has_column_privilege('authenticated', 'public.sale_items', 'unit_cost_snapshot', 'SELECT')
    and not has_column_privilege('authenticated', 'public.sales_return_items', 'unit_cost_snapshot', 'SELECT')
    and not has_column_privilege('authenticated', 'public.product_batches', 'unit_cost', 'SELECT')
    and not has_column_privilege('authenticated', 'public.stock_movements', 'unit_cost', 'SELECT'),
  'authenticated users cannot directly select product or ledger costs'
);

select ok(
  not has_table_privilege('authenticated', 'public.sales', 'INSERT')
    and not has_table_privilege('authenticated', 'public.sales', 'DELETE')
    and not has_column_privilege('authenticated', 'public.purchase_items', 'received_quantity', 'INSERT'),
  'financial writes use controlled operations rather than direct ledger edits'
);

select ok(
  to_regprocedure('public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric)') is not null
    and to_regprocedure('public.receive_purchase(uuid,uuid,jsonb,text)') is not null
    and to_regprocedure('public.approve_sales_return(uuid,text,uuid)') is not null
    and to_regprocedure('public.reject_sales_return(uuid,text)') is not null
    and to_regprocedure('public.adjust_inventory(uuid,numeric,text,text,uuid,text,date)') is not null
    and to_regprocedure('public.admin_update_employee(uuid,text,text,text,text,text,boolean)') is not null,
  'required transactional and administration RPCs exist'
);

select ok(
  (
    select bool_and(p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'open_cash_session', 'close_cash_session', 'complete_sale',
        'record_customer_payment', 'get_customer_balance', 'receive_purchase',
        'record_purchase_payment', 'request_sales_return',
        'approve_sales_return', 'reject_sales_return', 'adjust_inventory',
        'admin_update_employee', 'admin_create_notification'
      )
  ),
  'privileged RPCs run with restricted SECURITY DEFINER functions'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'public.adjust_inventory(uuid,numeric,text,text,uuid,text,date)',
      'EXECUTE'
    ),
  'anonymous users cannot execute privileged RPCs'
);

select ok(
  exists (
    select 1 from pg_class c
    where c.oid = 'public.sales_profit_summary'::regclass
      and c.reloptions @> array['security_barrier=true']
  )
    and exists (
      select 1 from pg_class c
      where c.oid = 'public.admin_product_costs'::regclass
        and c.reloptions @> array['security_barrier=true']
    ),
  'sensitive reporting views enforce permission filters behind barriers'
);

select ok(
  to_regclass('public.low_stock_products') is not null
    and to_regclass('public.monthly_budget_summary') is not null
    and to_regclass('public.monthly_budget_category_summary') is not null
    and exists (
      select 1 from pg_class c
      where c.oid = 'public.low_stock_products'::regclass
        and c.reloptions @> array['security_invoker=true']
    ),
  'low-stock and monthly budget views exist and honor base-table RLS'
);

select * from finish();

rollback;
