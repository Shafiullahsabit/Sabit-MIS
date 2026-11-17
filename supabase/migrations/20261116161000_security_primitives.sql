-- Permission helpers, audit/timestamp triggers, budget guards, and stock ledger.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.business_today()
returns date
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (now() at time zone coalesce(
    (select s.timezone_name from public.store_settings s where s.singleton),
    'Asia/Kabul'
  ))::date;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
  );
$$;

create or replace function public.current_user_has_permission(
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    where p.id = auth.uid()
      and p.is_active
      and rp.permission_code = p_permission_code
  );
$$;

create view public.admin_product_costs
with (security_barrier = true)
as
select
  p.id as product_id,
  p.sku,
  p.purchase_price,
  p.average_cost,
  p.wholesale_price
from public.products p
where public.current_user_has_permission('catalog.manage');

create view public.supplier_balances
with (security_invoker = true)
as
select
  s.id as supplier_id,
  coalesce(sum(
    round(
      pi.line_total
        * (pi.received_quantity / nullif(pi.ordered_quantity, 0)),
      2
    )
  ), 0)::numeric(14, 2) as received_total,
  coalesce(payments.paid_total, 0)::numeric(14, 2) as paid_total,
  (
    coalesce(sum(
      round(
        pi.line_total
          * (pi.received_quantity / nullif(pi.ordered_quantity, 0)),
        2
      )
    ), 0) - coalesce(payments.paid_total, 0)
  )::numeric(14, 2) as balance_due
from public.suppliers s
left join public.purchases p
  on p.supplier_id = s.id and p.status <> 'cancelled'
left join public.purchase_items pi on pi.purchase_id = p.id
left join lateral (
  select coalesce(sum(pp.amount), 0) as paid_total
  from public.purchase_payments pp
  join public.purchases paid_purchase on paid_purchase.id = pp.purchase_id
  where paid_purchase.supplier_id = s.id
    and paid_purchase.status <> 'cancelled'
) payments on true
where public.current_user_has_permission('purchasing.manage')
group by s.id, payments.paid_total;

create view public.customer_balances
with (security_invoker = true)
as
select
  c.id as customer_id,
  coalesce(sum(ct.amount), 0)::numeric(14, 2) as balance_due
from public.customers c
left join public.customer_transactions ct on ct.customer_id = c.id
where public.current_user_has_permission('customers.ledger.read')
group by c.id;

create view public.admin_product_batch_costs
with (security_barrier = true)
as
select
  b.id as batch_id,
  b.product_id,
  b.batch_code,
  b.expires_on,
  b.quantity_received,
  b.quantity_remaining,
  b.unit_cost
from public.product_batches b
where public.current_user_has_permission('inventory.manage');

create view public.admin_stock_movement_costs
with (security_barrier = true)
as
select
  m.id as movement_id,
  m.product_id,
  m.batch_id,
  m.movement_type,
  m.quantity_delta,
  m.unit_cost,
  m.source_type,
  m.source_id,
  m.occurred_at
from public.stock_movements m
where public.current_user_has_permission('inventory.manage');

create view public.low_stock_products
with (security_invoker = true)
as
select
  p.id as product_id,
  p.sku,
  p.name,
  p.minimum_stock,
  coalesce(i.quantity_on_hand, 0)::numeric(18, 3) as quantity_on_hand
from public.products p
left join public.inventory i on i.product_id = p.id
where p.is_active
  and p.tracks_inventory
  and public.current_user_has_permission('inventory.read')
  and coalesce(i.quantity_on_hand, 0) <= p.minimum_stock;

create view public.sales_profit_summary
with (security_barrier = true)
as
select
  s.id as sale_id,
  s.receipt_number,
  s.sold_at,
  s.cashier_id,
  s.customer_id,
  s.status,
  s.subtotal,
  s.discount_amount,
  s.tax_amount,
  s.total_amount,
  s.amount_paid,
  s.balance_due,
  coalesce(sum(si.quantity * si.unit_cost_snapshot), 0)::numeric(14, 2)
    - coalesce(max(return_costs.restocked_cost), 0)::numeric(14, 2)
    as cost_of_goods_sold,
  coalesce(max(return_totals.returned_amount), 0)::numeric(14, 2)
    as returned_amount,
  (
    (s.total_amount - coalesce(max(return_totals.returned_amount), 0))
      * (1 - s.tax_amount / nullif(s.total_amount, 0))
      - (
        coalesce(sum(si.quantity * si.unit_cost_snapshot), 0)
          - coalesce(max(return_costs.restocked_cost), 0)
      )
  )::numeric(14, 2) as gross_profit
from public.sales s
left join public.sale_items si on si.sale_id = s.id
left join lateral (
  select sum(sr.return_amount) as returned_amount
  from public.sales_returns sr
  where sr.sale_id = s.id and sr.status = 'approved'
) return_totals on true
left join lateral (
  select sum(ri.quantity * ri.unit_cost_snapshot) as restocked_cost
  from public.sales_returns sr
  join public.sales_return_items ri on ri.sales_return_id = sr.id
  where sr.sale_id = s.id
    and sr.status = 'approved'
    and ri.restock_to_inventory
) return_costs on true
where public.current_user_has_permission('sales.read_all')
group by s.id;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cashier_role_id uuid;
  v_display_name text;
begin
  select r.id into v_cashier_role_id
  from public.roles r
  where r.code = 'cashier';

  if v_cashier_role_id is null then
    raise exception 'Cashier role must be seeded before creating Auth users';
  end if;

  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'New employee'
  );

  insert into public.profiles (id, role_id, display_name, is_active)
  values (new.id, v_cashier_role_id, v_display_name, false);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_row jsonb;
  v_entity_id uuid;
  v_metadata jsonb;
  v_changed_fields text[];
begin
  v_metadata := jsonb_build_object('operation', lower(tg_op));

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  if nullif(v_row ->> 'id', '') is not null then
    v_entity_id := (v_row ->> 'id')::uuid;
  elsif nullif(v_row ->> 'product_id', '') is not null then
    v_entity_id := (v_row ->> 'product_id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), array[]::text[])
    into v_changed_fields
    from jsonb_each(to_jsonb(new)) as n(key, value)
    where to_jsonb(old) -> n.key is distinct from n.value;

    v_metadata := v_metadata
      || jsonb_build_object('changed_fields', v_changed_fields);
  end if;

  insert into public.activity_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_metadata
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.guard_budget_allocation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_budget_id uuid;
  v_total_budget numeric(14, 2);
  v_existing_allocations numeric(14, 2);
begin
  v_budget_id := new.budget_id;

  select b.total_budget into v_total_budget
  from public.monthly_budgets b
  where b.id = v_budget_id
  for update;

  if v_total_budget is null then
    raise exception 'Monthly budget does not exist';
  end if;

  select coalesce(sum(i.allocated_amount), 0)
  into v_existing_allocations
  from public.monthly_budget_items i
  where i.budget_id = v_budget_id
    and (tg_op <> 'UPDATE' or i.id <> old.id);

  if v_existing_allocations + new.allocated_amount > v_total_budget then
    raise exception 'Category allocations cannot exceed the monthly budget';
  end if;

  return new;
end;
$$;

create or replace function public.guard_budget_total()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_allocated_total numeric(14, 2);
begin
  select coalesce(sum(i.allocated_amount), 0)
  into v_allocated_total
  from public.monthly_budget_items i
  where i.budget_id = old.id;

  if v_allocated_total > new.total_budget then
    raise exception 'Monthly budget cannot be lower than its category allocations';
  end if;

  return new;
end;
$$;

create trigger monthly_budget_items_allocation_guard
  before insert or update on public.monthly_budget_items
  for each row execute function public.guard_budget_allocation();

create trigger monthly_budgets_total_guard
  before update of total_budget on public.monthly_budgets
  for each row execute function public.guard_budget_total();

create or replace function public._record_stock_change(
  p_product_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_source_type text,
  p_source_id uuid,
  p_actor_id uuid,
  p_request_key uuid,
  p_request_line integer,
  p_note text default null,
  p_batch_id uuid default null,
  p_batch_code text default null,
  p_expires_on date default null,
  p_unit_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product record;
  v_on_hand numeric(18, 3);
  v_remaining numeric(18, 3);
  v_take numeric(18, 3);
  v_movement_index integer := 0;
  v_batch record;
  v_batch_id uuid;
begin
  if p_quantity_delta = 0 or p_request_key is null then
    raise exception 'A non-zero quantity and idempotency key are required';
  end if;

  if p_movement_type in ('sale', 'damaged', 'expired')
    and p_quantity_delta >= 0 then
    raise exception 'This stock movement type requires a negative quantity';
  end if;

  if p_movement_type in ('purchase_receipt', 'customer_return', 'initial')
    and p_quantity_delta <= 0 then
    raise exception 'This stock movement type requires a positive quantity';
  end if;

  select p.id, p.tracks_inventory, p.tracks_batches, p.average_cost
  into v_product
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product does not exist';
  end if;

  if not v_product.tracks_inventory then
    raise exception 'Product is missing or does not track inventory';
  end if;

  insert into public.inventory (product_id, quantity_on_hand)
  values (p_product_id, 0)
  on conflict (product_id) do nothing;

  select i.quantity_on_hand into v_on_hand
  from public.inventory i
  where i.product_id = p_product_id
  for update;

  if p_quantity_delta > 0 then
    if v_product.tracks_batches then
      if p_batch_id is not null then
        select b.id into v_batch_id
        from public.product_batches b
        where b.id = p_batch_id
          and b.product_id = p_product_id
        for update;

        if v_batch_id is null then
          raise exception 'Batch does not belong to this product';
        end if;

        update public.product_batches
        set quantity_remaining = quantity_remaining + p_quantity_delta
        where id = v_batch_id;
      elsif p_batch_code is not null then
        insert into public.product_batches (
          product_id,
          batch_code,
          expires_on,
          quantity_received,
          quantity_remaining,
          unit_cost
        )
        values (
          p_product_id,
          btrim(p_batch_code),
          p_expires_on,
          p_quantity_delta,
          0,
          coalesce(p_unit_cost, v_product.average_cost)
        )
        on conflict (product_id, batch_code) do update
        set expires_on = coalesce(
              excluded.expires_on,
              public.product_batches.expires_on
            ),
            unit_cost = (
              public.product_batches.unit_cost
                * public.product_batches.quantity_received
              + excluded.unit_cost * excluded.quantity_received
            ) / (
              public.product_batches.quantity_received
                + excluded.quantity_received
            ),
            quantity_received = public.product_batches.quantity_received
              + excluded.quantity_received
        returning id into v_batch_id;

        update public.product_batches
        set quantity_remaining = quantity_remaining + p_quantity_delta
        where id = v_batch_id;
      else
        raise exception 'A batch-tracked product requires a batch identifier';
      end if;
    elsif p_batch_id is not null or p_batch_code is not null then
      raise exception 'A batch was supplied for a product without batch tracking';
    end if;

    update public.inventory
    set quantity_on_hand = quantity_on_hand + p_quantity_delta
    where product_id = p_product_id;

    if p_movement_type = 'customer_return' then
      update public.products
      set average_cost = (
        v_on_hand * v_product.average_cost
          + p_quantity_delta * coalesce(p_unit_cost, v_product.average_cost)
      ) / (v_on_hand + p_quantity_delta)
      where id = p_product_id;
    end if;

    insert into public.stock_movements (
      product_id, batch_id, movement_type, quantity_delta, unit_cost,
      source_type, source_id, request_key, request_line, movement_index,
      note, actor_id
    )
    values (
      p_product_id, v_batch_id, p_movement_type, p_quantity_delta,
      coalesce(p_unit_cost, v_product.average_cost, 0),
      p_source_type, p_source_id,
      p_request_key, p_request_line, 0, p_note, p_actor_id
    );

    return;
  end if;

  if v_on_hand < abs(p_quantity_delta) then
    raise exception 'Insufficient inventory for product %', p_product_id;
  end if;

  v_remaining := abs(p_quantity_delta);

  if v_product.tracks_batches then
    if p_movement_type = 'expired'
      and p_batch_id is not null
      and not exists (
        select 1 from public.product_batches b
        where b.id = p_batch_id
          and b.product_id = p_product_id
          and b.expires_on < public.business_today()
      ) then
      raise exception 'Only expired batches can use an expiry movement';
    end if;

    for v_batch in
      select b.id, b.quantity_remaining, b.unit_cost
      from public.product_batches b
      where b.product_id = p_product_id
        and b.quantity_remaining > 0
        and (
          (p_batch_id is not null and b.id = p_batch_id)
          or (
            p_batch_id is null
            and p_movement_type = 'expired'
            and b.expires_on < public.business_today()
          )
          or (
            p_batch_id is null
            and p_movement_type <> 'expired'
            and (b.expires_on is null or b.expires_on >= public.business_today())
          )
        )
      order by b.expires_on asc nulls last, b.received_at, b.id
      for update
    loop
      v_take := least(v_remaining, v_batch.quantity_remaining);

      update public.product_batches
      set quantity_remaining = quantity_remaining - v_take
      where id = v_batch.id;

      insert into public.stock_movements (
        product_id, batch_id, movement_type, quantity_delta, unit_cost,
        source_type, source_id, request_key, request_line, movement_index,
        note, actor_id
      )
      values (
        p_product_id, v_batch.id, p_movement_type, -v_take, v_batch.unit_cost,
        p_source_type, p_source_id, p_request_key, p_request_line,
        v_movement_index, p_note, p_actor_id
      );

      v_movement_index := v_movement_index + 1;
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;
  else
    if p_batch_id is not null then
      raise exception 'A batch was supplied for a product without batch tracking';
    end if;

    insert into public.stock_movements (
      product_id, movement_type, quantity_delta, unit_cost,
      source_type, source_id, request_key, request_line, movement_index,
      note, actor_id
    )
    values (
      p_product_id, p_movement_type, p_quantity_delta,
      coalesce(v_product.average_cost, 0), p_source_type, p_source_id,
      p_request_key, p_request_line, 0, p_note, p_actor_id
    );
    v_remaining := 0;
  end if;

  if v_remaining > 0 then
    raise exception 'Insufficient unexpired batch inventory for product %',
      p_product_id;
  end if;

  update public.inventory
  set quantity_on_hand = quantity_on_hand + p_quantity_delta
  where product_id = p_product_id;
end;
$$;

create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_note text,
  p_request_key uuid,
  p_batch_code text default null,
  p_expires_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_movement_id uuid;
  v_batch_id uuid;
  v_decimal_places smallint;
begin
  if not public.current_user_has_permission('inventory.manage') then
    raise exception 'Permission denied: inventory.manage';
  end if;

  if p_movement_type is null
    or p_movement_type not in ('adjustment', 'damaged', 'expired')
    or p_quantity_delta is null
    or p_quantity_delta = 0
    or p_quantity_delta::text in ('NaN', 'Infinity', '-Infinity')
    or (p_movement_type in ('damaged', 'expired') and p_quantity_delta >= 0)
    or p_request_key is null
    or nullif(btrim(p_note), '') is null then
    raise exception 'Invalid inventory adjustment';
  end if;

  select u.decimal_places into v_decimal_places
  from public.products p
  join public.units u on u.id = p.unit_id
  where p.id = p_product_id;

  if not found then
    raise exception 'Product does not exist';
  end if;

  if round(p_quantity_delta, v_decimal_places) <> p_quantity_delta then
    raise exception 'Quantity exceeds the precision allowed by the product unit';
  end if;

  if p_quantity_delta < 0 and p_expires_on is not null then
    raise exception 'Expiry dates can only be supplied when adding stock';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select m.id into v_movement_id
  from public.stock_movements m
  where m.request_key = p_request_key
  order by m.movement_index
  limit 1;

  if v_movement_id is not null then
    if exists (
      select 1
      from public.stock_movements m
      where m.request_key = p_request_key
        and (
          m.product_id is distinct from p_product_id
          or m.movement_type is distinct from p_movement_type
          or m.source_type is distinct from 'manual_adjustment'
        )
    ) or (
      select coalesce(sum(m.quantity_delta), 0)
      from public.stock_movements m
      where m.request_key = p_request_key
    ) <> p_quantity_delta then
      raise exception 'Idempotency key was already used for a different adjustment';
    end if;

    return v_movement_id;
  end if;

  if p_quantity_delta < 0 and p_batch_code is not null then
    select b.id into v_batch_id
    from public.product_batches b
    where b.product_id = p_product_id
      and b.batch_code = btrim(p_batch_code)
    for update;

    if v_batch_id is null then
      raise exception 'Batch does not exist for this product';
    end if;
  end if;

  perform public._record_stock_change(
    p_product_id,
    p_quantity_delta,
    p_movement_type,
    'manual_adjustment',
    null,
    auth.uid(),
    p_request_key,
    0,
    p_note,
    v_batch_id,
    case when p_quantity_delta > 0 then p_batch_code end,
    case when p_quantity_delta > 0 then p_expires_on end
  );

  select m.id into v_movement_id
  from public.stock_movements m
  where m.request_key = p_request_key
  order by m.movement_index
  limit 1;

  return v_movement_id;
end;
$$;

create or replace function public.admin_update_employee(
  p_employee_id uuid,
  p_role_code text,
  p_display_name text,
  p_employee_code text,
  p_phone text,
  p_preferred_language text,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_role_id uuid;
  v_old_profile public.profiles%rowtype;
  v_active_admin_count integer;
begin
  if not public.current_user_has_permission('employees.manage') then
    raise exception 'Permission denied: employees.manage';
  end if;

  if p_preferred_language is null
    or p_preferred_language not in ('en', 'fa', 'ps')
    or p_is_active is null
    or nullif(btrim(p_display_name), '') is null then
    raise exception 'Invalid employee profile data';
  end if;

  select r.id into v_role_id
  from public.roles r
  where r.code = p_role_code;

  if v_role_id is null then
    raise exception 'Unknown employee role';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('active-admin-roster', 0));

  select p.* into v_old_profile
  from public.profiles p
  where p.id = p_employee_id
  for update;

  if not found then
    raise exception 'Employee profile does not exist';
  end if;

  if p_employee_id = auth.uid()
    and (
      not p_is_active
      or v_old_profile.role_id <> v_role_id
    ) then
    raise exception 'An administrator cannot deactivate or demote themselves';
  end if;

  if v_old_profile.is_active and p_is_active
    and v_old_profile.role_id <> v_role_id then
    if exists (
      select 1 from public.roles r
      where r.id = v_old_profile.role_id and r.code = 'admin'
    ) then
      select count(*) into v_active_admin_count
      from public.profiles p
      join public.roles r on r.id = p.role_id
      where r.code = 'admin' and p.is_active;

      if v_active_admin_count <= 1 then
        raise exception 'The last active administrator cannot be demoted';
      end if;
    end if;
  end if;

  if v_old_profile.is_active and not p_is_active
    and exists (
      select 1 from public.roles r
      where r.id = v_old_profile.role_id and r.code = 'admin'
    ) then
    select count(*) into v_active_admin_count
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where r.code = 'admin' and p.is_active;

    if v_active_admin_count <= 1 then
      raise exception 'The last active administrator cannot be deactivated';
    end if;
  end if;

  update public.profiles
  set role_id = v_role_id,
      display_name = btrim(p_display_name),
      employee_code = nullif(btrim(p_employee_code), ''),
      phone = nullif(btrim(p_phone), ''),
      preferred_language = p_preferred_language,
      is_active = p_is_active
  where id = p_employee_id;

  return p_employee_id;
end;
$$;

create or replace function public.admin_create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_category text default 'system',
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_notification_id uuid;
begin
  if not public.current_user_has_permission('notifications.manage') then
    raise exception 'Permission denied: notifications.manage';
  end if;

  if p_user_id is null
    or nullif(btrim(p_title), '') is null
    or nullif(btrim(p_body), '') is null
    or nullif(btrim(p_category), '') is null
    or p_data is null
    or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Invalid notification';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.is_active
  ) then
    raise exception 'Notification recipient is not an active employee';
  end if;

  insert into public.notifications (user_id, title, body, category, data)
  values (
    p_user_id,
    btrim(p_title),
    btrim(p_body),
    btrim(p_category),
    p_data
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

create trigger receipt_settings_set_updated_at
  before update on public.receipt_settings
  for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create trigger units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger product_translations_set_updated_at
  before update on public.product_translations
  for each row execute function public.set_updated_at();

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

create trigger purchase_items_set_updated_at
  before update on public.purchase_items
  for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create trigger expense_categories_set_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

create trigger monthly_budget_items_set_updated_at
  before update on public.monthly_budget_items
  for each row execute function public.set_updated_at();

create trigger sales_returns_set_updated_at
  before update on public.sales_returns
  for each row execute function public.set_updated_at();

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();

create trigger settings_audit
  after insert or update or delete on public.store_settings
  for each row execute function public.audit_row_change();

create trigger receipt_settings_audit
  after insert or update or delete on public.receipt_settings
  for each row execute function public.audit_row_change();

create trigger system_settings_audit
  after insert or update or delete on public.system_settings
  for each row execute function public.audit_row_change();

create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function public.audit_row_change();

create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();

create trigger brands_audit
  after insert or update or delete on public.brands
  for each row execute function public.audit_row_change();

create trigger units_audit
  after insert or update or delete on public.units
  for each row execute function public.audit_row_change();

create trigger product_barcodes_audit
  after insert or update or delete on public.product_barcodes
  for each row execute function public.audit_row_change();

create trigger product_translations_audit
  after insert or update or delete on public.product_translations
  for each row execute function public.audit_row_change();

create trigger inventory_audit
  after insert or update or delete on public.inventory
  for each row execute function public.audit_row_change();

create trigger suppliers_audit
  after insert or update or delete on public.suppliers
  for each row execute function public.audit_row_change();

create trigger purchase_items_audit
  after insert or update or delete on public.purchase_items
  for each row execute function public.audit_row_change();

create trigger purchases_audit
  after insert or update or delete on public.purchases
  for each row execute function public.audit_row_change();

create trigger purchase_receipt_items_audit
  after insert or update or delete on public.purchase_receipt_items
  for each row execute function public.audit_row_change();

create trigger purchase_receipts_audit
  after insert on public.purchase_receipts
  for each row execute function public.audit_row_change();

create trigger purchase_payments_audit
  after insert on public.purchase_payments
  for each row execute function public.audit_row_change();

create trigger sales_audit
  after insert or update or delete on public.sales
  for each row execute function public.audit_row_change();

create trigger sale_items_audit
  after insert or update or delete on public.sale_items
  for each row execute function public.audit_row_change();

create trigger sale_payments_audit
  after insert on public.sale_payments
  for each row execute function public.audit_row_change();

create trigger sales_returns_audit
  after insert or update or delete on public.sales_returns
  for each row execute function public.audit_row_change();

create trigger customers_audit
  after insert or update or delete on public.customers
  for each row execute function public.audit_row_change();

create trigger sales_return_items_audit
  after insert or update or delete on public.sales_return_items
  for each row execute function public.audit_row_change();

create trigger expenses_audit
  after insert or update or delete on public.expenses
  for each row execute function public.audit_row_change();

create trigger expense_categories_audit
  after insert or update or delete on public.expense_categories
  for each row execute function public.audit_row_change();

create trigger monthly_budgets_audit
  after insert or update or delete on public.monthly_budgets
  for each row execute function public.audit_row_change();

create trigger monthly_budget_items_audit
  after insert or update or delete on public.monthly_budget_items
  for each row execute function public.audit_row_change();

create trigger cash_sessions_audit
  after insert or update or delete on public.cash_sessions
  for each row execute function public.audit_row_change();

create trigger customer_transactions_audit
  after insert or update or delete on public.customer_transactions
  for each row execute function public.audit_row_change();

create trigger stock_movements_audit
  after insert or update or delete on public.stock_movements
  for each row execute function public.audit_row_change();

create trigger notifications_audit
  after insert or update or delete on public.notifications
  for each row execute function public.audit_row_change();
