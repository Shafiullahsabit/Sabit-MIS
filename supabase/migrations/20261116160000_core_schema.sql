-- Core Sabit Super Store MIS schema.
-- Money uses AFN-friendly decimal amounts; stock quantities support fractions.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissions (
  code text primary key check (code ~ '^[a-z][a-z0-9_.]*$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  employee_code text check (
    employee_code is null
    or length(btrim(employee_code)) between 1 and 40
  ),
  phone text,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'fa', 'ps')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_employee_code_unique
  on public.profiles (employee_code)
  where employee_code is not null;

create table public.store_settings (
  singleton boolean primary key default true check (singleton),
  store_name text not null default 'Sabit Super Store',
  logo_path text,
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(address) = 'object'),
  tax_number text,
  tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100),
  currency_code text not null default 'AFN'
    check (currency_code ~ '^[A-Z]{3}$'),
  timezone_name text not null default 'Asia/Kabul',
  default_language text not null default 'en'
    check (default_language in ('en', 'fa', 'ps')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]*$'),
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  is_cash boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipt_settings (
  singleton boolean primary key default true check (singleton),
  header_text text,
  footer_text text,
  show_logo boolean not null default true,
  show_tax_number boolean not null default true,
  show_cashier boolean not null default true,
  language text not null default 'en'
    check (language in ('en', 'fa', 'ps')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index categories_parent_id_idx on public.categories (parent_id);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  symbol text,
  decimal_places smallint not null default 0
    check (decimal_places between 0 and 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (length(btrim(sku)) between 1 and 80),
  name text not null check (length(btrim(name)) between 1 and 200),
  description text,
  category_id uuid references public.categories(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  purchase_price numeric(14, 4) not null default 0 check (purchase_price >= 0),
  average_cost numeric(14, 4) not null default 0 check (average_cost >= 0),
  selling_price numeric(14, 4) not null check (selling_price >= 0),
  wholesale_price numeric(14, 4) check (
    wholesale_price is null or wholesale_price >= 0
  ),
  minimum_stock numeric(18, 3) not null default 0 check (minimum_stock >= 0),
  image_path text,
  is_weighted boolean not null default false,
  tracks_inventory boolean not null default true,
  tracks_batches boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not tracks_batches or tracks_inventory)
);

create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx on public.products (brand_id);
create index products_active_name_idx on public.products (name) where is_active;

create table public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  barcode text not null unique check (length(btrim(barcode)) between 1 and 80),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index product_barcodes_one_primary_per_product
  on public.product_barcodes (product_id)
  where is_primary;
create index product_barcodes_product_id_idx
  on public.product_barcodes (product_id);

create table public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  language text not null check (language in ('en', 'fa', 'ps')),
  name text not null check (length(btrim(name)) between 1 and 200),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, language)
);

create index product_translations_language_idx
  on public.product_translations (language);

create table public.inventory (
  product_id uuid primary key references public.products(id) on delete restrict,
  quantity_on_hand numeric(18, 3) not null default 0
    check (quantity_on_hand >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  batch_code text not null check (length(btrim(batch_code)) between 1 and 100),
  expires_on date,
  quantity_received numeric(18, 3) not null check (quantity_received > 0),
  quantity_remaining numeric(18, 3) not null default 0
    check (quantity_remaining >= 0 and quantity_remaining <= quantity_received),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (product_id, batch_code)
);

create index product_batches_product_expiry_idx
  on public.product_batches (product_id, expires_on, received_at)
  where quantity_remaining > 0;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  batch_id uuid references public.product_batches(id) on delete restrict,
  movement_type text not null check (
    movement_type in (
      'purchase_receipt', 'sale', 'customer_return',
      'adjustment', 'damaged', 'expired', 'initial'
    )
  ),
  quantity_delta numeric(18, 3) not null check (quantity_delta <> 0),
  unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0),
  source_type text,
  source_id uuid,
  request_key uuid,
  request_line integer not null default 0 check (request_line >= 0),
  movement_index integer not null default 0 check (movement_index >= 0),
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  unique (request_key, request_line, movement_index)
);

create index stock_movements_product_time_idx
  on public.stock_movements (product_id, occurred_at desc);
create index stock_movements_source_idx
  on public.stock_movements (source_type, source_id);
create index stock_movements_batch_idx
  on public.stock_movements (batch_id) where batch_id is not null;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  contact_name text,
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(address) = 'object'),
  tax_number text,
  notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_name_idx on public.suppliers (name);
create index suppliers_active_idx on public.suppliers (id) where is_active;

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  invoice_number text not null check (length(btrim(invoice_number)) between 1 and 100),
  purchase_date date not null default (timezone('Asia/Kabul', now()))::date,
  status text not null default 'draft' check (
    status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')
  ),
  notes text,
  created_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, invoice_number)
);

create index purchases_supplier_date_idx
  on public.purchases (supplier_id, purchase_date desc);
create index purchases_status_date_idx
  on public.purchases (status, purchase_date desc);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  sku_snapshot text not null,
  product_name_snapshot text not null,
  ordered_quantity numeric(18, 3) not null check (ordered_quantity > 0),
  received_quantity numeric(18, 3) not null default 0
    check (received_quantity >= 0 and received_quantity <= ordered_quantity),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  discount_amount numeric(14, 2) not null default 0
    check (discount_amount >= 0),
  line_total numeric(14, 2) generated always as (
    round(ordered_quantity * unit_cost - discount_amount, 2)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= round(ordered_quantity * unit_cost, 2))
);

create index purchase_items_purchase_id_idx
  on public.purchase_items (purchase_id);
create index purchase_items_product_id_idx
  on public.purchase_items (product_id);

create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  request_key uuid not null unique,
  receipt_number bigint generated always as identity unique,
  notes text,
  received_by uuid references public.profiles(id) on delete set null,
  received_at timestamptz not null default now()
);

create index purchase_receipts_purchase_date_idx
  on public.purchase_receipts (purchase_id, received_at desc);

create table public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_receipts(id) on delete restrict,
  purchase_item_id uuid not null references public.purchase_items(id) on delete restrict,
  quantity numeric(18, 3) not null check (quantity > 0),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  batch_id uuid references public.product_batches(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index purchase_receipt_items_receipt_id_idx
  on public.purchase_receipt_items (receipt_id);
create index purchase_receipt_items_purchase_item_idx
  on public.purchase_receipt_items (purchase_item_id);

create table public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  request_key uuid not null unique,
  amount numeric(14, 2) not null check (amount > 0),
  reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index purchase_payments_purchase_date_idx
  on public.purchase_payments (purchase_id, paid_at desc);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  full_name text not null check (length(btrim(full_name)) between 1 and 200),
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(address) = 'object'),
  notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (full_name);
create index customers_phone_idx on public.customers (phone) where phone is not null;

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  opening_request_key uuid not null unique,
  opening_float numeric(14, 2) not null default 0 check (opening_float >= 0),
  expected_cash numeric(14, 2),
  counted_cash numeric(14, 2) check (counted_cash is null or counted_cash >= 0),
  cash_difference numeric(14, 2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  check (
    (closed_at is null and counted_cash is null and cash_difference is null)
    or (closed_at is not null and counted_cash is not null and expected_cash is not null)
  )
);

create unique index cash_sessions_one_open_per_cashier
  on public.cash_sessions (cashier_id)
  where closed_at is null;
create index cash_sessions_cashier_opened_idx
  on public.cash_sessions (cashier_id, opened_at desc);

create sequence public.sale_receipt_number_seq start with 100001;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint not null default nextval('public.sale_receipt_number_seq')
    unique,
  request_key uuid not null unique,
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  status text not null default 'completed' check (
    status in ('completed', 'voided', 'partially_refunded', 'refunded')
  ),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  discount_amount numeric(14, 2) not null default 0
    check (discount_amount >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14, 2) generated always as (
    round(subtotal - discount_amount + tax_amount, 2)
  ) stored,
  amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0),
  return_adjusted_amount numeric(14, 2) not null default 0
    check (return_adjusted_amount >= 0),
  balance_due numeric(14, 2) generated always as (
    greatest(
      round(subtotal - discount_amount + tax_amount, 2)
        - amount_paid - return_adjusted_amount,
      0
    )
  ) stored,
  sold_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= subtotal),
  check (amount_paid + return_adjusted_amount <= total_amount)
);

create index sales_cashier_date_idx on public.sales (cashier_id, sold_at desc);
create index sales_customer_date_idx
  on public.sales (customer_id, sold_at desc) where customer_id is not null;
create index sales_session_date_idx
  on public.sales (cash_session_id, sold_at desc);
create index sales_status_date_idx on public.sales (status, sold_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  sku_snapshot text not null,
  product_name_snapshot text not null,
  quantity numeric(18, 3) not null check (quantity > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(14, 4) not null check (unit_cost_snapshot >= 0),
  discount_amount numeric(14, 2) not null default 0
    check (discount_amount >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  line_total numeric(14, 2) generated always as (
    round(quantity * unit_price - discount_amount + tax_amount, 2)
  ) stored,
  created_at timestamptz not null default now(),
  check (discount_amount <= round(quantity * unit_price, 2))
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  reference text,
  recorded_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index sale_payments_sale_date_idx
  on public.sale_payments (sale_id, paid_at desc);
create index sale_payments_method_date_idx
  on public.sale_payments (payment_method_id, paid_at desc);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_category_id uuid not null references public.expense_categories(id)
    on delete restrict,
  expense_date date not null default (timezone('Asia/Kabul', now()))::date,
  description text not null check (length(btrim(description)) between 1 and 500),
  amount numeric(14, 2) not null check (amount > 0),
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  reference text,
  status text not null default 'recorded' check (status in ('recorded', 'voided')),
  recorded_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  voided_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'recorded' and voided_at is null)
    or (status = 'voided' and voided_at is not null)
  )
);

create index expenses_category_date_idx
  on public.expenses (expense_category_id, expense_date);
create index expenses_date_status_idx
  on public.expenses (expense_date, status);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  budget_year smallint not null check (budget_year between 2000 and 2200),
  budget_month smallint not null check (budget_month between 1 and 12),
  total_budget numeric(14, 2) not null check (total_budget >= 0),
  notes text,
  created_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_year, budget_month)
);

create table public.monthly_budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.monthly_budgets(id) on delete cascade,
  expense_category_id uuid not null references public.expense_categories(id)
    on delete restrict,
  allocated_amount numeric(14, 2) not null check (allocated_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_id, expense_category_id)
);

create index monthly_budget_items_category_idx
  on public.monthly_budget_items (expense_category_id);

create table public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  sale_id uuid not null references public.sales(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  return_amount numeric(14, 2) not null default 0 check (return_amount >= 0),
  refund_amount numeric(14, 2) not null default 0 check (refund_amount >= 0),
  credit_adjustment_amount numeric(14, 2) not null default 0
    check (credit_adjustment_amount >= 0),
  refund_payment_method_id uuid references public.payment_methods(id)
    on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refund_amount + credit_adjustment_amount <= return_amount),
  check (
    (
      status = 'pending'
      and approved_at is null
      and rejected_at is null
      and rejection_reason is null
    )
    or (
      status = 'approved'
      and approved_at is not null
      and rejected_at is null
      and rejection_reason is null
    )
    or (
      status = 'rejected'
      and rejected_at is not null
      and approved_at is null
      and rejection_reason is not null
    )
  ),
  check (
    refund_amount = 0 or refund_payment_method_id is not null
  )
);

create index sales_returns_sale_status_idx
  on public.sales_returns (sale_id, status);
create index sales_returns_requested_by_idx
  on public.sales_returns (requested_by, requested_at desc);

create table public.customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  transaction_type text not null check (
    transaction_type in ('sale_credit', 'payment', 'return_credit', 'adjustment')
  ),
  amount numeric(14, 2) not null check (amount <> 0),
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  sale_payment_id uuid references public.sale_payments(id) on delete restrict,
  sales_return_id uuid references public.sales_returns(id) on delete restrict,
  request_key uuid unique,
  note text,
  recorded_by uuid default auth.uid()
    references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (transaction_type in ('sale_credit', 'adjustment') and amount > 0)
    or (transaction_type in ('payment', 'return_credit') and amount < 0)
  )
);

create index customer_transactions_customer_time_idx
  on public.customer_transactions (customer_id, occurred_at desc);
create index customer_transactions_sale_id_idx
  on public.customer_transactions (sale_id) where sale_id is not null;

create table public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id)
    on delete restrict,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  quantity numeric(18, 3) not null check (quantity > 0),
  condition text not null check (
    condition in ('sellable', 'damaged', 'expired', 'quarantine')
  ),
  restock_to_inventory boolean not null default false,
  batch_id uuid references public.product_batches(id) on delete restrict,
  unit_price_snapshot numeric(14, 4) not null check (unit_price_snapshot >= 0),
  unit_cost_snapshot numeric(14, 4) not null check (unit_cost_snapshot >= 0),
  discount_per_unit_snapshot numeric(14, 4) not null default 0
    check (discount_per_unit_snapshot >= 0),
  created_at timestamptz not null default now(),
  check (not restock_to_inventory or condition = 'sellable')
);

create index sales_return_items_return_idx
  on public.sales_return_items (sales_return_id);
create index sales_return_items_sale_item_idx
  on public.sales_return_items (sale_item_id);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index activity_logs_actor_time_idx
  on public.activity_logs (actor_id, created_at desc);
create index activity_logs_entity_time_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 2000),
  category text not null default 'system',
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create view public.monthly_budget_summary
with (security_invoker = true)
as
select
  b.id as budget_id,
  b.budget_year,
  b.budget_month,
  b.total_budget,
  coalesce(allocations.allocated_total, 0)::numeric(14, 2) as allocated_total,
  coalesce(actuals.actual_total, 0)::numeric(14, 2) as actual_total,
  (b.total_budget - coalesce(actuals.actual_total, 0))::numeric(14, 2)
    as remaining_budget,
  case
    when b.total_budget = 0 and coalesce(actuals.actual_total, 0) > 0 then 100
    when b.total_budget = 0 then 0
    else round(coalesce(actuals.actual_total, 0) * 100 / b.total_budget, 2)
  end as utilization_percent,
  coalesce(actuals.actual_total, 0) > b.total_budget as is_over_budget
from public.monthly_budgets b
left join lateral (
  select sum(i.allocated_amount) as allocated_total
  from public.monthly_budget_items i where i.budget_id = b.id
) allocations on true
left join lateral (
  select sum(e.amount) as actual_total
  from public.expenses e
  where e.status = 'recorded'
    and e.expense_date >= make_date(b.budget_year::integer, b.budget_month::integer, 1)
    and e.expense_date < (
      make_date(b.budget_year::integer, b.budget_month::integer, 1)
      + interval '1 month'
    )::date
) actuals on true;

create view public.monthly_budget_category_summary
with (security_invoker = true)
as
select
  b.id as budget_id,
  b.budget_year,
  b.budget_month,
  ec.id as expense_category_id,
  ec.name as category_name,
  coalesce(i.allocated_amount, 0)::numeric(14, 2) as allocated_amount,
  coalesce(actuals.actual_amount, 0)::numeric(14, 2) as actual_amount,
  (coalesce(i.allocated_amount, 0) - coalesce(actuals.actual_amount, 0))
    ::numeric(14, 2)
    as remaining_amount,
  coalesce(actuals.actual_amount, 0) > coalesce(i.allocated_amount, 0)
    as is_over_budget,
  case
    when coalesce(i.allocated_amount, 0) = 0
      and coalesce(actuals.actual_amount, 0) > 0 then 100
    when coalesce(i.allocated_amount, 0) = 0 then 0
    else round(
      coalesce(actuals.actual_amount, 0) * 100 / i.allocated_amount,
      2
    )
  end as utilization_percent
from public.monthly_budgets b
cross join public.expense_categories ec
left join public.monthly_budget_items i
  on i.budget_id = b.id and i.expense_category_id = ec.id
left join lateral (
  select sum(e.amount) as actual_amount
  from public.expenses e
  where e.expense_category_id = ec.id
    and e.status = 'recorded'
    and e.expense_date >= make_date(b.budget_year::integer, b.budget_month::integer, 1)
    and e.expense_date < (
      make_date(b.budget_year::integer, b.budget_month::integer, 1)
      + interval '1 month'
    )::date
) actuals on true;