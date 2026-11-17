insert into public.roles (code, name, description, is_system)
values
  ('admin', 'Admin', 'Full administrative access to the store MIS.', true),
  ('cashier', 'Cashier', 'Point-of-sale and assigned cashier workflows.', true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_system = excluded.is_system;

insert into public.permissions (code, description)
values
  ('employees.read', 'Read employee profiles.'),
  ('employees.manage', 'Update employee role, profile, and active status.'),
  ('settings.read', 'Read store and receipt settings.'),
  ('settings.manage', 'Manage store, system, payment, and receipt settings.'),
  ('catalog.read', 'Read product catalog and barcode data.'),
  ('catalog.manage', 'Create and update products, categories, brands, and units.'),
  ('inventory.read', 'Read stock balances, batches, and movement history.'),
  ('inventory.manage', 'Adjust inventory and manage stock operations.'),
  ('suppliers.read', 'Read supplier records and balances.'),
  ('suppliers.manage', 'Create and update suppliers.'),
  ('purchasing.read', 'Read purchase invoices and receipts.'),
  ('purchasing.manage', 'Create and edit purchase orders.'),
  ('purchasing.receive', 'Receive ordered goods into inventory.'),
  ('purchasing.pay', 'Record supplier purchase payments.'),
  ('customers.read', 'Read customer records.'),
  ('customers.create', 'Create customer records at point of sale.'),
  ('customers.manage', 'Update customer records.'),
  ('customers.balance.read', 'Read an individual customer balance.'),
  ('customers.ledger.read', 'Read the customer financial ledger.'),
  ('customers.record_payment', 'Record a customer account payment.'),
  ('sales.read_all', 'Read all sales and sales profitability.'),
  ('sales.read_own', 'Read sales made by the current cashier.'),
  ('sales.create', 'Complete point-of-sale transactions.'),
  ('sales.discount', 'Apply discounts to sales.'),
  ('cash_sessions.manage_own', 'Open and close the current cashier session.'),
  ('cash_sessions.manage_all', 'Read and close any cashier session.'),
  ('expenses.read', 'Read expense records and categories.'),
  ('expenses.manage', 'Record, update, and void business expenses.'),
  ('budgets.read', 'Read monthly budgets and actual spending.'),
  ('budgets.manage', 'Create and update monthly budgets and allocations.'),
  ('sales_returns.request', 'Request a return against an eligible sale.'),
  ('sales_returns.manage_all', 'Read and manage all return requests.'),
  ('sales_returns.approve', 'Approve returns, refunds, and sellable restocks.'),
  ('activity.read', 'Read the administrative activity log.'),
  ('notifications.manage', 'Create notifications for active employees.'),
  ('notifications.read', 'Read and mark the current user notifications.')
on conflict (code) do update
set description = excluded.description;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'admin'
on conflict (role_id, permission_code) do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'catalog.read',
  'inventory.read',
  'sales.read_own',
  'sales.create',
  'cash_sessions.manage_own',
  'customers.read',
  'customers.create',
  'customers.balance.read',
  'customers.record_payment',
  'sales_returns.request',
  'notifications.read'
)
where r.code = 'cashier'
on conflict (role_id, permission_code) do nothing;

insert into public.payment_methods (code, name, is_cash, sort_order)
values
  ('cash', 'Cash', true, 10),
  ('card', 'Card', false, 20),
  ('bank_transfer', 'Bank transfer', false, 30),
  ('mobile_wallet', 'Mobile wallet', false, 40)
on conflict (code) do update
set name = excluded.name,
    is_cash = excluded.is_cash,
    sort_order = excluded.sort_order;

insert into public.units (code, name, symbol, decimal_places)
values
  ('piece', 'Piece', 'pc', 0),
  ('kilogram', 'Kilogram', 'kg', 3),
  ('gram', 'Gram', 'g', 0),
  ('liter', 'Liter', 'L', 3),
  ('milliliter', 'Milliliter', 'mL', 0),
  ('pack', 'Pack', 'pack', 0),
  ('box', 'Box', 'box', 0)
on conflict (code) do update
set name = excluded.name,
    symbol = excluded.symbol,
    decimal_places = excluded.decimal_places;

insert into public.expense_categories (code, name, description)
values
  ('salaries', 'Salaries', 'Employee wages and salaries.'),
  ('rent', 'Rent', 'Store and storage rent.'),
  ('electricity', 'Electricity', 'Electricity and power costs.'),
  ('transportation', 'Transportation', 'Business transport and delivery costs.'),
  ('maintenance', 'Maintenance', 'Store, equipment, and vehicle maintenance.'),
  ('utilities', 'Utilities', 'Water, internet, and other utility costs.'),
  ('other', 'Other', 'Other approved business expenses.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.categories (name, slug, description)
values
  ('Grocery', 'grocery', 'Food, beverages, and everyday grocery products.'),
  ('General merchandise', 'general-merchandise', 'Household and other retail goods.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description;

insert into public.store_settings (
  singleton,
  store_name,
  currency_code,
  timezone_name,
  default_language,
  tax_rate
)
values (true, 'Sabit Super Store', 'AFN', 'Asia/Kabul', 'en', 0)
on conflict (singleton) do nothing;

insert into public.receipt_settings (singleton, language)
values (true, 'en')
on conflict (singleton) do nothing;

insert into public.system_settings (key, value, description)
values
  ('inventory.low_stock_alerts', 'true'::jsonb, 'Enable low-stock notifications.'),
  ('inventory.expiry_alert_days', '30'::jsonb, 'Days before expiry to alert staff.'),
  ('locales.enabled', '["en","fa","ps"]'::jsonb, 'Enabled application languages.')
on conflict (key) do nothing;
