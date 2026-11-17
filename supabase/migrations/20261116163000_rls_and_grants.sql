-- Default-deny access. Authenticated users receive only the table grants and
-- permission-filtered rows required by their seeded role.

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to authenticated;
alter default privileges in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
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
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
  end loop;
end;
$$;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant select on all tables in schema public to authenticated;

revoke select on
  public.products,
  public.product_batches,
  public.stock_movements,
  public.sale_items,
  public.sales_return_items
from authenticated;

grant select (
  id, sku, name, description, category_id, brand_id, unit_id, selling_price,
  minimum_stock, image_path, is_weighted, tracks_inventory, tracks_batches,
  is_active, created_at, updated_at
) on public.products to authenticated;

grant select (
  id, product_id, batch_code, expires_on, quantity_received,
  quantity_remaining, received_at, created_at
) on public.product_batches to authenticated;

grant select (
  id, product_id, batch_id, movement_type, quantity_delta, source_type,
  source_id, request_key, request_line, movement_index, note, actor_id,
  occurred_at
) on public.stock_movements to authenticated;

grant select (
  id, sale_id, product_id, sku_snapshot, product_name_snapshot, quantity,
  unit_price, discount_amount, tax_amount, line_total, created_at
) on public.sale_items to authenticated;

grant select (
  id, sales_return_id, sale_item_id, quantity, condition,
  restock_to_inventory, batch_id, unit_price_snapshot,
  discount_per_unit_snapshot, created_at
) on public.sales_return_items to authenticated;

create policy roles_read_authenticated
  on public.roles for select to authenticated
  using (public.current_user_is_active());

create policy permissions_read_authenticated
  on public.permissions for select to authenticated
  using (public.current_user_is_active());

create policy role_permissions_read_authenticated
  on public.role_permissions for select to authenticated
  using (public.current_user_is_active());

create policy profiles_read_self_or_admin
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_has_permission('employees.read')
  );

create policy profiles_update_admin
  on public.profiles for update to authenticated
  using (public.current_user_has_permission('employees.manage'))
  with check (public.current_user_has_permission('employees.manage'));

create policy store_settings_read_staff
  on public.store_settings for select to authenticated
  using (public.current_user_is_active());

create policy store_settings_manage_admin
  on public.store_settings for all to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

create policy system_settings_admin_only
  on public.system_settings for all to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

create policy payment_methods_read_staff
  on public.payment_methods for select to authenticated
  using (public.current_user_is_active());

create policy payment_methods_manage_admin
  on public.payment_methods for all to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

create policy receipt_settings_read_staff
  on public.receipt_settings for select to authenticated
  using (public.current_user_is_active());

create policy receipt_settings_manage_admin
  on public.receipt_settings for all to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

create policy categories_read_staff
  on public.categories for select to authenticated
  using (public.current_user_is_active());
create policy categories_manage_admin
  on public.categories for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy brands_read_staff
  on public.brands for select to authenticated
  using (public.current_user_is_active());
create policy brands_manage_admin
  on public.brands for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy units_read_staff
  on public.units for select to authenticated
  using (public.current_user_is_active());
create policy units_manage_admin
  on public.units for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy products_read_staff
  on public.products for select to authenticated
  using (public.current_user_is_active());
create policy products_manage_admin
  on public.products for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy product_barcodes_read_staff
  on public.product_barcodes for select to authenticated
  using (public.current_user_is_active());
create policy product_barcodes_manage_admin
  on public.product_barcodes for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy product_translations_read_staff
  on public.product_translations for select to authenticated
  using (public.current_user_is_active());
create policy product_translations_manage_admin
  on public.product_translations for all to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

create policy inventory_read_permitted_staff
  on public.inventory for select to authenticated
  using (public.current_user_has_permission('inventory.read'));

create policy batches_read_permitted_staff
  on public.product_batches for select to authenticated
  using (public.current_user_has_permission('inventory.read'));

create policy stock_movements_read_permitted_staff
  on public.stock_movements for select to authenticated
  using (public.current_user_has_permission('inventory.read'));

create policy suppliers_read_permitted_staff
  on public.suppliers for select to authenticated
  using (
    public.current_user_has_permission('suppliers.read')
    or public.current_user_has_permission('suppliers.manage')
  );
create policy suppliers_manage_admin
  on public.suppliers for all to authenticated
  using (public.current_user_has_permission('suppliers.manage'))
  with check (public.current_user_has_permission('suppliers.manage'));

create policy purchases_read_permitted_staff
  on public.purchases for select to authenticated
  using (
    public.current_user_has_permission('purchasing.read')
    or public.current_user_has_permission('purchasing.manage')
  );
create policy purchases_insert_admin
  on public.purchases for insert to authenticated
  with check (
    public.current_user_has_permission('purchasing.manage')
    and (created_by is null or created_by = auth.uid())
    and status in ('draft', 'ordered')
  );
create policy purchases_update_admin
  on public.purchases for update to authenticated
  using (
    public.current_user_has_permission('purchasing.manage')
    and status in ('draft', 'ordered')
  )
  with check (
    public.current_user_has_permission('purchasing.manage')
    and status in ('draft', 'ordered')
  );

create policy purchase_items_read_permitted_staff
  on public.purchase_items for select to authenticated
  using (
    public.current_user_has_permission('purchasing.read')
    or public.current_user_has_permission('purchasing.manage')
  );
create policy purchase_items_insert_admin
  on public.purchase_items for insert to authenticated
  with check (
    public.current_user_has_permission('purchasing.manage')
    and exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.status in ('draft', 'ordered')
    )
  );
create policy purchase_items_update_admin
  on public.purchase_items for update to authenticated
  using (
    public.current_user_has_permission('purchasing.manage')
    and exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.status in ('draft', 'ordered')
    )
  )
  with check (
    public.current_user_has_permission('purchasing.manage')
    and exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.status in ('draft', 'ordered')
    )
  );

create policy purchase_receipts_read_permitted_staff
  on public.purchase_receipts for select to authenticated
  using (
    public.current_user_has_permission('purchasing.read')
    or public.current_user_has_permission('purchasing.manage')
  );
create policy purchase_receipt_items_read_permitted_staff
  on public.purchase_receipt_items for select to authenticated
  using (
    public.current_user_has_permission('purchasing.read')
    or public.current_user_has_permission('purchasing.manage')
  );
create policy purchase_payments_read_admin
  on public.purchase_payments for select to authenticated
  using (public.current_user_has_permission('purchasing.manage'));

create policy customers_read_permitted_staff
  on public.customers for select to authenticated
  using (
    public.current_user_has_permission('customers.read')
    or public.current_user_has_permission('customers.manage')
  );
create policy customers_insert_permitted_staff
  on public.customers for insert to authenticated
  with check (
    public.current_user_has_permission('customers.create')
    or public.current_user_has_permission('customers.manage')
  );
create policy customers_update_admin
  on public.customers for update to authenticated
  using (public.current_user_has_permission('customers.manage'))
  with check (public.current_user_has_permission('customers.manage'));

create policy customer_transactions_admin_read
  on public.customer_transactions for select to authenticated
  using (public.current_user_has_permission('customers.ledger.read'));

create policy cash_sessions_read_own_or_admin
  on public.cash_sessions for select to authenticated
  using (
    (
      cashier_id = auth.uid()
      and public.current_user_has_permission('cash_sessions.manage_own')
    )
    or public.current_user_has_permission('cash_sessions.manage_all')
  );

create policy sales_read_own_or_admin
  on public.sales for select to authenticated
  using (
    public.current_user_has_permission('sales.read_all')
    or (
      cashier_id = auth.uid()
      and public.current_user_has_permission('sales.read_own')
    )
  );

create policy sale_items_read_own_or_admin
  on public.sale_items for select to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (
          public.current_user_has_permission('sales.read_all')
          or (
            s.cashier_id = auth.uid()
            and public.current_user_has_permission('sales.read_own')
          )
        )
    )
  );

create policy sale_payments_read_own_or_admin
  on public.sale_payments for select to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (
          public.current_user_has_permission('sales.read_all')
          or (
            s.cashier_id = auth.uid()
            and public.current_user_has_permission('sales.read_own')
          )
        )
    )
  );

create policy expense_categories_admin_read
  on public.expense_categories for select to authenticated
  using (public.current_user_has_permission('expenses.read'));
create policy expense_categories_admin_manage
  on public.expense_categories for all to authenticated
  using (public.current_user_has_permission('expenses.manage'))
  with check (public.current_user_has_permission('expenses.manage'));

create policy expenses_admin_read
  on public.expenses for select to authenticated
  using (public.current_user_has_permission('expenses.read'));
create policy expenses_admin_manage
  on public.expenses for all to authenticated
  using (public.current_user_has_permission('expenses.manage'))
  with check (public.current_user_has_permission('expenses.manage'));

create policy monthly_budgets_admin_read
  on public.monthly_budgets for select to authenticated
  using (public.current_user_has_permission('budgets.read'));
create policy monthly_budgets_admin_manage
  on public.monthly_budgets for all to authenticated
  using (public.current_user_has_permission('budgets.manage'))
  with check (public.current_user_has_permission('budgets.manage'));

create policy monthly_budget_items_admin_read
  on public.monthly_budget_items for select to authenticated
  using (public.current_user_has_permission('budgets.read'));
create policy monthly_budget_items_admin_manage
  on public.monthly_budget_items for all to authenticated
  using (public.current_user_has_permission('budgets.manage'))
  with check (public.current_user_has_permission('budgets.manage'));

create policy sales_returns_read_requester_or_admin
  on public.sales_returns for select to authenticated
  using (
    public.current_user_has_permission('sales_returns.manage_all')
    or (
      public.current_user_is_active()
      and (
        (
          requested_by = auth.uid()
          and public.current_user_has_permission('sales_returns.request')
        )
        or exists (
          select 1 from public.sales s
          where s.id = sale_id
            and s.cashier_id = auth.uid()
            and public.current_user_has_permission('sales.read_own')
        )
      )
    )
  );

create policy sales_return_items_read_requester_or_admin
  on public.sales_return_items for select to authenticated
  using (
    exists (
      select 1 from public.sales_returns sr
      where sr.id = sales_return_id
        and (
          public.current_user_has_permission('sales_returns.manage_all')
          or (
            public.current_user_is_active()
            and (
              (
                sr.requested_by = auth.uid()
                and public.current_user_has_permission('sales_returns.request')
              )
              or exists (
                select 1 from public.sales s
                where s.id = sr.sale_id
                  and s.cashier_id = auth.uid()
                  and public.current_user_has_permission('sales.read_own')
              )
            )
          )
        )
    )
  );

create policy activity_logs_admin_read
  on public.activity_logs for select to authenticated
  using (public.current_user_has_permission('activity.read'));

create policy notifications_read_own
  on public.notifications for select to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_permission('notifications.read')
  );

create policy notifications_mark_read_own
  on public.notifications for update to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_has_permission('notifications.read')
  )
  with check (
    user_id = auth.uid()
    and public.current_user_has_permission('notifications.read')
  );

grant insert, update on
  public.store_settings,
  public.system_settings,
  public.payment_methods,
  public.receipt_settings,
  public.categories,
  public.brands,
  public.units,
  public.product_barcodes,
  public.product_translations,
  public.suppliers,
  public.customers,
  public.expense_categories,
  public.expenses,
  public.monthly_budgets,
  public.monthly_budget_items
to authenticated;

grant insert (
  sku, name, description, category_id, brand_id, unit_id, purchase_price,
  selling_price, wholesale_price, minimum_stock, image_path, is_weighted,
  tracks_inventory, tracks_batches, is_active
) on public.products to authenticated;
grant update (
  sku, name, description, category_id, brand_id, unit_id, purchase_price,
  selling_price, wholesale_price, minimum_stock, image_path, is_weighted,
  tracks_inventory, tracks_batches, is_active
) on public.products to authenticated;

grant insert (
  supplier_id, invoice_number, purchase_date, status, notes, created_by
) on public.purchases to authenticated;
grant insert (
  purchase_id, product_id, sku_snapshot, product_name_snapshot,
  ordered_quantity, unit_cost, discount_amount
) on public.purchase_items to authenticated;
grant update (supplier_id, invoice_number, purchase_date, notes)
  on public.purchases to authenticated;
grant update (
  ordered_quantity, unit_cost, discount_amount, sku_snapshot, product_name_snapshot
)
  on public.purchase_items to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on
  public.supplier_balances,
  public.customer_balances,
  public.monthly_budget_summary,
  public.monthly_budget_category_summary,
  public.sales_profit_summary,
  public.admin_product_costs,
  public.admin_product_batch_costs,
  public.admin_stock_movement_costs
to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.business_today() to authenticated;
grant execute on function public.current_user_is_active() to authenticated;
grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.adjust_inventory(
  uuid, numeric, text, text, uuid, text, date
) to authenticated;
grant execute on function public.admin_update_employee(
  uuid, text, text, text, text, text, boolean
) to authenticated;
grant execute on function public.admin_create_notification(
  uuid, text, text, text, jsonb
) to authenticated;
grant execute on function public.open_cash_session(uuid, numeric) to authenticated;
grant execute on function public.close_cash_session(uuid, numeric) to authenticated;
grant execute on function public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric
) to authenticated;
grant execute on function public.record_customer_payment(
  uuid, uuid, numeric, text, uuid, uuid, text, text
) to authenticated;
grant execute on function public.get_customer_balance(uuid) to authenticated;
grant execute on function public.receive_purchase(
  uuid, uuid, jsonb, text
) to authenticated;
grant execute on function public.record_purchase_payment(
  uuid, uuid, numeric, text, text
) to authenticated;
grant execute on function public.request_sales_return(
  uuid, uuid, text, jsonb
) to authenticated;
grant execute on function public.approve_sales_return(
  uuid, text, uuid
) to authenticated;
grant execute on function public.reject_sales_return(uuid, text)
  to authenticated;
