-- Atomic workflows. The caller either receives every associated ledger write,
-- or the transaction rolls back without leaving partial stock or balances.

create or replace function public.open_cash_session(
  p_request_key uuid,
  p_opening_float numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_session_id uuid;
begin
  if auth.uid() is null or not public.current_user_is_active()
    or not (
      public.current_user_has_permission('cash_sessions.manage_own')
      or public.current_user_has_permission('cash_sessions.manage_all')
    ) then
    raise exception 'Permission denied: cash session access';
  end if;

  if p_request_key is null or p_opening_float is null
    or p_opening_float < 0
    or p_opening_float::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Invalid cash session request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select cs.id into v_session_id
  from public.cash_sessions cs
  where cs.opening_request_key = p_request_key;

  if v_session_id is not null then
    return v_session_id;
  end if;

  insert into public.cash_sessions (
    cashier_id,
    opening_request_key,
    opening_float
  )
  values (auth.uid(), p_request_key, p_opening_float)
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.close_cash_session(
  p_session_id uuid,
  p_counted_cash numeric
)
returns table (
  session_id uuid,
  expected_cash numeric(14, 2),
  counted_cash numeric(14, 2),
  cash_difference numeric(14, 2)
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_expected numeric(14, 2);
  v_cash_received numeric(14, 2);
  v_customer_cash_received numeric(14, 2);
  v_cash_refunded numeric(14, 2);
begin
  if auth.uid() is null or not public.current_user_is_active()
    or not (
      public.current_user_has_permission('cash_sessions.manage_own')
      or public.current_user_has_permission('cash_sessions.manage_all')
    ) then
    raise exception 'Permission denied: cash session access';
  end if;

  if p_counted_cash is null or p_counted_cash < 0
    or p_counted_cash::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Counted cash cannot be negative';
  end if;

  select cs.* into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
  for update;

  if not found then
    raise exception 'Cash session does not exist';
  end if;

  if v_session.cashier_id <> auth.uid()
    and not public.current_user_has_permission('cash_sessions.manage_all') then
    raise exception 'Permission denied: this cash session belongs to another employee';
  end if;

  if v_session.closed_at is not null then
    return query
    select v_session.id, v_session.expected_cash,
      v_session.counted_cash, v_session.cash_difference;
    return;
  end if;

  select coalesce(sum(sp.amount), 0)::numeric(14, 2)
  into v_cash_received
  from public.sale_payments sp
  join public.payment_methods pm on pm.id = sp.payment_method_id
  where sp.cash_session_id = p_session_id
    and pm.is_cash;

  select coalesce(sum(-ct.amount), 0)::numeric(14, 2)
  into v_customer_cash_received
  from public.customer_transactions ct
  join public.payment_methods pm on pm.id = ct.payment_method_id
  where ct.cash_session_id = p_session_id
    and ct.transaction_type = 'payment'
    and ct.sale_payment_id is null
    and pm.is_cash;

  select coalesce(sum(sr.refund_amount), 0)::numeric(14, 2)
  into v_cash_refunded
  from public.sales_returns sr
  join public.payment_methods pm on pm.id = sr.refund_payment_method_id
  where sr.cash_session_id = p_session_id
    and sr.status = 'approved'
    and pm.is_cash;

  v_expected := v_session.opening_float
    + v_cash_received + v_customer_cash_received - v_cash_refunded;

  update public.cash_sessions
  set expected_cash = v_expected,
      counted_cash = p_counted_cash,
      cash_difference = p_counted_cash - v_expected,
      closed_at = now()
  where id = p_session_id
  returning * into v_session;

  return query
  select v_session.id, v_session.expected_cash,
    v_session.counted_cash, v_session.cash_difference;
end;
$$;

create or replace function public.complete_sale(
  p_request_key uuid,
  p_cash_session_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_payments jsonb default '[]'::jsonb,
  p_header_discount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_sale_id uuid;
  v_sale_item_id uuid;
  v_cashier_id uuid := auth.uid();
  v_session_cashier uuid;
  v_customer_active boolean;
  v_product record;
  v_item record;
  v_payment record;
  v_method_id uuid;
  v_payment_amount numeric(14, 2);
  v_tax_rate numeric(5, 2);
  v_on_hand numeric(18, 3);
  v_gross numeric(14, 2);
  v_line_tax numeric(14, 2);
  v_discount_base numeric(14, 2);
  v_header_discount_share numeric(14, 2);
  v_header_discount_remaining numeric(14, 2);
  v_discount_base_remaining numeric(14, 2);
  v_cost_snapshot numeric(14, 4);
  v_subtotal numeric(14, 2) := 0;
  v_line_discount_total numeric(14, 2) := 0;
  v_tax_total numeric(14, 2) := 0;
  v_discount_total numeric(14, 2);
  v_total numeric(14, 2);
  v_paid numeric(14, 2) := 0;
  v_line_index integer;
  v_item_count integer;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('sales.create') then
    raise exception 'Permission denied: sales.create';
  end if;

  if p_request_key is null
    or coalesce(jsonb_typeof(p_items), '') <> 'array'
    or coalesce(jsonb_typeof(p_payments), '') <> 'array'
    or p_header_discount is null
    or p_header_discount < 0 then
    raise exception 'Invalid sale request';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must contain at least one item';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as x(value)
    where coalesce(jsonb_typeof(x.value), '') <> 'object'
  ) then
    raise exception 'Sale items must be JSON objects';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select s.id into v_sale_id
  from public.sales s
  where s.request_key = p_request_key;

  if v_sale_id is not null then
    return v_sale_id;
  end if;

  select cs.cashier_id into v_session_cashier
  from public.cash_sessions cs
  where cs.id = p_cash_session_id
    and cs.closed_at is null
  for update;

  if v_session_cashier is null then
    raise exception 'An open cash session is required';
  end if;

  if v_session_cashier <> v_cashier_id
    and not public.current_user_has_permission('cash_sessions.manage_all') then
    raise exception 'Permission denied: cash session belongs to another employee';
  end if;

  for v_item in
    select
      (x.value ->> 'product_id')::uuid as product_id,
      sum((x.value ->> 'quantity')::numeric) as quantity
    from jsonb_array_elements(p_items) as x(value)
    group by (x.value ->> 'product_id')::uuid
    order by (x.value ->> 'product_id')::uuid
  loop
    select p.tracks_inventory, p.is_active, u.decimal_places
    into v_product
    from public.products p
    join public.units u on u.id = p.unit_id
    where p.id = v_item.product_id
    for share of p, u;

    if not found then
      raise exception 'Product % does not exist', v_item.product_id;
    end if;

    if not v_product.is_active then
      raise exception 'Product % does not exist or is inactive', v_item.product_id;
    end if;

    if v_item.quantity is null or v_item.quantity <= 0
      or v_item.quantity::text in ('NaN', 'Infinity', '-Infinity')
      or round(v_item.quantity, v_product.decimal_places) <> v_item.quantity then
      raise exception 'Invalid quantity for product %', v_item.product_id;
    end if;

    if v_product.tracks_inventory then
      select i.quantity_on_hand into v_on_hand
      from public.inventory i
      where i.product_id = v_item.product_id
      for update;

      if not found then
        v_on_hand := 0;
      end if;

      if v_item.quantity > v_on_hand then
        raise exception 'Insufficient inventory for product %', v_item.product_id;
      end if;
    end if;
  end loop;

  select coalesce(s.tax_rate, 0) into v_tax_rate
  from public.store_settings s
  where s.singleton;

  v_tax_rate := coalesce(v_tax_rate, 0);

  for v_item in
    select
      (x.value ->> 'product_id')::uuid as product_id,
      (x.value ->> 'quantity')::numeric as quantity,
      coalesce(nullif(x.value ->> 'discount_amount', '')::numeric, 0)
        as discount_amount,
      x.ordinality::integer as line_index
    from jsonb_array_elements(p_items) with ordinality as x(value, ordinality)
    order by x.ordinality
  loop
    if v_item.quantity is null or v_item.quantity <= 0
      or v_item.quantity::text in ('NaN', 'Infinity', '-Infinity')
      or v_item.discount_amount < 0
      or v_item.discount_amount::text in ('NaN', 'Infinity', '-Infinity')
      or round(v_item.discount_amount, 2) <> v_item.discount_amount then
      raise exception 'Sale quantities and discounts must be non-negative';
    end if;

    select p.id, p.sku, p.name, p.selling_price, p.average_cost,
      p.tracks_inventory, p.is_active, u.decimal_places
    into v_product
    from public.products p
    join public.units u on u.id = p.unit_id
    where p.id = v_item.product_id
    for share of p, u;

    if not found then
      raise exception 'Product % does not exist', v_item.product_id;
    end if;

    if not v_product.is_active then
      raise exception 'Product % does not exist or is inactive', v_item.product_id;
    end if;

    if round(v_item.quantity, v_product.decimal_places) <> v_item.quantity then
      raise exception 'Quantity exceeds the precision allowed by the product unit';
    end if;

    v_gross := round(v_item.quantity * v_product.selling_price, 2);
    if v_item.discount_amount > v_gross then
      raise exception 'Line discount cannot exceed the line price';
    end if;

    v_subtotal := v_subtotal + v_gross;
    v_line_discount_total := v_line_discount_total + v_item.discount_amount;
  end loop;

  if p_header_discount::text in ('NaN', 'Infinity', '-Infinity')
    or round(p_header_discount, 2) <> p_header_discount
    or p_header_discount > v_subtotal - v_line_discount_total then
    raise exception 'Header discount exceeds the remaining sale value';
  end if;

  if (p_header_discount > 0 or v_line_discount_total > 0)
    and not public.current_user_has_permission('sales.discount') then
    raise exception 'Permission denied: sales.discount';
  end if;

  v_discount_total := v_line_discount_total + p_header_discount;
  v_header_discount_remaining := p_header_discount;
  v_discount_base_remaining := v_subtotal - v_line_discount_total;
  v_item_count := jsonb_array_length(p_items);

  for v_item in
    select
      (x.value ->> 'product_id')::uuid as product_id,
      (x.value ->> 'quantity')::numeric as quantity,
      coalesce(nullif(x.value ->> 'discount_amount', '')::numeric, 0)
        as discount_amount,
      x.ordinality::integer as line_index
    from jsonb_array_elements(p_items) with ordinality as x(value, ordinality)
    order by x.ordinality
  loop
    select p.selling_price into v_product
    from public.products p
    where p.id = v_item.product_id
    for share;

    v_gross := round(v_item.quantity * v_product.selling_price, 2);
    v_discount_base := v_gross - v_item.discount_amount;
    if v_item.line_index = v_item_count then
      v_header_discount_share := v_header_discount_remaining;
    elsif v_discount_base_remaining > 0 then
      v_header_discount_share := least(
        v_header_discount_remaining,
        round(
          v_header_discount_remaining
            * v_discount_base / v_discount_base_remaining,
          2
        )
      );
    else
      v_header_discount_share := 0;
    end if;
    v_header_discount_remaining := v_header_discount_remaining
      - v_header_discount_share;
    v_discount_base_remaining := v_discount_base_remaining - v_discount_base;
    v_tax_total := v_tax_total + round(
      (v_discount_base - v_header_discount_share) * v_tax_rate / 100,
      2
    );
  end loop;

  v_total := round(v_subtotal - v_discount_total + v_tax_total, 2);

  if v_total <= 0 then
    raise exception 'Sale total must be greater than zero';
  end if;

  for v_payment in
    select x.value as value
    from jsonb_array_elements(p_payments) as x(value)
  loop
    if coalesce(jsonb_typeof(v_payment.value), '') <> 'object'
      or nullif(v_payment.value ->> 'method_code', '') is null
      or nullif(v_payment.value ->> 'amount', '') is null then
      raise exception 'Each payment requires a method_code and amount';
    end if;

    v_payment_amount := (v_payment.value ->> 'amount')::numeric;
    if v_payment_amount <= 0
      or v_payment_amount::text in ('NaN', 'Infinity', '-Infinity')
      or round(v_payment_amount, 2) <> v_payment_amount then
      raise exception 'Payment amounts must be greater than zero';
    end if;

    select pm.id into v_method_id
    from public.payment_methods pm
    where pm.code = v_payment.value ->> 'method_code'
      and pm.is_active;

    if v_method_id is null then
      raise exception 'Unknown or inactive payment method';
    end if;

    v_paid := v_paid + v_payment_amount;
  end loop;

  if v_paid > v_total then
    raise exception 'Payments cannot exceed the sale total';
  end if;

  if v_paid < v_total and p_customer_id is null then
    raise exception 'A customer is required for a sale with an outstanding balance';
  end if;

  if p_customer_id is not null then
    select c.is_active into v_customer_active
    from public.customers c
    where c.id = p_customer_id
    for share;

    if not found then
      raise exception 'Customer does not exist';
    end if;

    if not v_customer_active then
      raise exception 'Customer does not exist or is inactive';
    end if;
  end if;

  insert into public.sales (
    request_key,
    cash_session_id,
    cashier_id,
    customer_id,
    subtotal,
    discount_amount,
    tax_amount,
    amount_paid
  )
  values (
    p_request_key,
    p_cash_session_id,
    v_cashier_id,
    p_customer_id,
    v_subtotal,
    v_discount_total,
    v_tax_total,
    v_paid
  )
  returning id into v_sale_id;

  v_header_discount_remaining := p_header_discount;
  v_discount_base_remaining := v_subtotal - v_line_discount_total;

  for v_item in
    select
      (x.value ->> 'product_id')::uuid as product_id,
      (x.value ->> 'quantity')::numeric as quantity,
      coalesce(nullif(x.value ->> 'discount_amount', '')::numeric, 0)
        as discount_amount,
      x.ordinality::integer as line_index
    from jsonb_array_elements(p_items) with ordinality as x(value, ordinality)
    order by x.ordinality
  loop
    select p.id, p.sku, p.name, p.selling_price, p.average_cost,
      p.tracks_inventory, p.is_active
    into v_product
    from public.products p
    where p.id = v_item.product_id
    for share;

    v_gross := round(v_item.quantity * v_product.selling_price, 2);
    v_discount_base := v_gross - v_item.discount_amount;
    if v_item.line_index = v_item_count then
      v_header_discount_share := v_header_discount_remaining;
    elsif v_discount_base_remaining > 0 then
      v_header_discount_share := least(
        v_header_discount_remaining,
        round(
          v_header_discount_remaining
            * v_discount_base / v_discount_base_remaining,
          2
        )
      );
    else
      v_header_discount_share := 0;
    end if;
    v_header_discount_remaining := v_header_discount_remaining
      - v_header_discount_share;
    v_discount_base_remaining := v_discount_base_remaining - v_discount_base;
    v_line_tax := round(
      (v_discount_base - v_header_discount_share) * v_tax_rate / 100,
      2
    );

    insert into public.sale_items (
      sale_id,
      product_id,
      sku_snapshot,
      product_name_snapshot,
      quantity,
      unit_price,
      unit_cost_snapshot,
      discount_amount,
      tax_amount
    )
    values (
      v_sale_id,
      v_product.id,
      v_product.sku,
      v_product.name,
      v_item.quantity,
      v_product.selling_price,
      v_product.average_cost,
      v_item.discount_amount + v_header_discount_share,
      v_line_tax
    )
    returning id into v_sale_item_id;

    v_cost_snapshot := v_product.average_cost;
    if v_product.tracks_inventory then
      perform public._record_stock_change(
        v_product.id,
        -v_item.quantity,
        'sale',
        'sale_item',
        v_sale_item_id,
        v_cashier_id,
        p_request_key,
        v_item.line_index,
        'POS sale'
      );

      select coalesce(
        round(sum(-sm.quantity_delta * sm.unit_cost) / v_item.quantity, 4),
        v_product.average_cost
      )::numeric(14, 4)
      into v_cost_snapshot
      from public.stock_movements sm
      where sm.source_type = 'sale_item'
        and sm.source_id = v_sale_item_id
        and sm.request_key = p_request_key;

      update public.sale_items
      set unit_cost_snapshot = v_cost_snapshot
      where id = v_sale_item_id;
    end if;
  end loop;

  for v_payment in
    select x.value as value
    from jsonb_array_elements(p_payments) as x(value)
  loop
    select pm.id into v_method_id
    from public.payment_methods pm
    where pm.code = v_payment.value ->> 'method_code'
      and pm.is_active;

    insert into public.sale_payments (
      sale_id,
      cash_session_id,
      payment_method_id,
      amount,
      reference,
      recorded_by
    )
    values (
      v_sale_id,
      p_cash_session_id,
      v_method_id,
      (v_payment.value ->> 'amount')::numeric,
      nullif(v_payment.value ->> 'reference', ''),
      v_cashier_id
    );
  end loop;

  if p_customer_id is not null and v_total > v_paid then
    insert into public.customer_transactions (
      customer_id,
      transaction_type,
      amount,
      sale_id,
      request_key,
      note,
      recorded_by
    )
    values (
      p_customer_id,
      'sale_credit',
      v_total - v_paid,
      v_sale_id,
      p_request_key,
      'Credit created by POS sale',
      v_cashier_id
    );
  end if;

  return v_sale_id;
end;
$$;

create or replace function public.record_customer_payment(
  p_request_key uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method_code text,
  p_cash_session_id uuid default null,
  p_sale_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_transaction_id uuid;
  v_payment_id uuid;
  v_method_id uuid;
  v_session_cashier uuid;
  v_sale public.sales%rowtype;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('customers.record_payment') then
    raise exception 'Permission denied: customers.record_payment';
  end if;

  if p_request_key is null or p_amount is null or p_amount <= 0
    or p_amount::text in ('NaN', 'Infinity', '-Infinity')
    or round(p_amount, 2) <> p_amount then
    raise exception 'Invalid customer payment';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select ct.id into v_transaction_id
  from public.customer_transactions ct
  where ct.request_key = p_request_key;

  if v_transaction_id is not null then
    return v_transaction_id;
  end if;

  select pm.id into v_method_id
  from public.payment_methods pm
  where pm.code = p_payment_method_code
    and pm.is_active;

  if v_method_id is null then
    raise exception 'Unknown or inactive payment method';
  end if;

  if public.current_user_has_permission('cash_sessions.manage_own')
    and not public.current_user_has_permission('cash_sessions.manage_all') then
    if p_cash_session_id is null then
      raise exception 'Cashiers must collect payments in an open cash session';
    end if;
  end if;

  if p_cash_session_id is not null then
    select cs.cashier_id into v_session_cashier
    from public.cash_sessions cs
    where cs.id = p_cash_session_id
      and cs.closed_at is null
    for update;

    if v_session_cashier is null then
      raise exception 'An open cash session is required';
    end if;

    if v_session_cashier <> auth.uid()
      and not public.current_user_has_permission('cash_sessions.manage_all') then
      raise exception 'Permission denied: cash session belongs to another employee';
    end if;
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.is_active
  ) then
    raise exception 'Customer does not exist or is inactive';
  end if;

  if p_sale_id is not null then
    select s.* into v_sale
    from public.sales s
    where s.id = p_sale_id
    for update;

    if not found then
      raise exception 'Sale does not exist';
    end if;

    if v_sale.customer_id is distinct from p_customer_id
      or v_sale.balance_due < p_amount
      or v_sale.status in ('voided', 'refunded') then
      raise exception 'Payment does not match an outstanding customer sale';
    end if;

    insert into public.sale_payments (
      sale_id,
      cash_session_id,
      payment_method_id,
      amount,
      reference,
      recorded_by
    )
    values (
      p_sale_id,
      p_cash_session_id,
      v_method_id,
      p_amount,
      nullif(btrim(p_reference), ''),
      auth.uid()
    )
    returning id into v_payment_id;

    update public.sales
    set amount_paid = amount_paid + p_amount
    where id = p_sale_id;
  end if;

  insert into public.customer_transactions (
    customer_id,
    transaction_type,
    amount,
    payment_method_id,
    cash_session_id,
    sale_id,
    sale_payment_id,
    request_key,
    note,
    recorded_by
  )
  values (
    p_customer_id,
    'payment',
    -p_amount,
    v_method_id,
    p_cash_session_id,
    p_sale_id,
    v_payment_id,
    p_request_key,
    p_note,
    auth.uid()
  )
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

create or replace function public.get_customer_balance(p_customer_id uuid)
returns numeric(14, 2)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_balance numeric(14, 2);
begin
  if not public.current_user_has_permission('customers.balance.read') then
    raise exception 'Permission denied: customers.balance.read';
  end if;

  select coalesce(sum(ct.amount), 0)::numeric(14, 2)
  into v_balance
  from public.customer_transactions ct
  where ct.customer_id = p_customer_id;

  return v_balance;
end;
$$;

create or replace function public.receive_purchase(
  p_request_key uuid,
  p_purchase_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_receipt_id uuid;
  v_receipt_item_id uuid;
  v_purchase public.purchases%rowtype;
  v_item record;
  v_purchase_item public.purchase_items%rowtype;
  v_product record;
  v_batch_id uuid;
  v_old_quantity numeric(18, 3);
  v_old_average_cost numeric(14, 4);
  v_new_quantity numeric(18, 3);
  v_effective_cost numeric(14, 4);
  v_line_index integer := 0;
  v_input_count integer;
  v_matched_count integer;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('purchasing.receive') then
    raise exception 'Permission denied: purchasing.receive';
  end if;

  if p_request_key is null
    or coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Invalid purchase receipt';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase receipt must contain at least one item';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as x(value)
    where coalesce(jsonb_typeof(x.value), '') <> 'object'
  ) then
    raise exception 'Purchase receipt lines must be JSON objects';
  end if;

  select count(*) into v_input_count
  from jsonb_to_recordset(p_items)
    as x(purchase_item_id uuid, quantity numeric, batch_code text, expires_on date);

  select count(*) into v_matched_count
  from jsonb_to_recordset(p_items)
    as x(purchase_item_id uuid, quantity numeric, batch_code text, expires_on date)
  join public.purchase_items pi on pi.id = x.purchase_item_id
  where pi.purchase_id = p_purchase_id;

  if v_input_count <> v_matched_count then
    raise exception 'Every receipt line must belong to this purchase';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select pr.id into v_receipt_id
  from public.purchase_receipts pr
  where pr.request_key = p_request_key;

  if v_receipt_id is not null then
    return v_receipt_id;
  end if;

  select p.* into v_purchase
  from public.purchases p
  where p.id = p_purchase_id
  for update;

  if not found then
    raise exception 'Purchase does not exist';
  end if;

  if v_purchase.status not in ('ordered', 'partially_received') then
    raise exception 'Only an ordered purchase can receive goods';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items)
      as x(purchase_item_id uuid, quantity numeric, batch_code text, expires_on date)
    group by x.purchase_item_id
    having count(*) > 1
  ) then
    raise exception 'A purchase item may appear only once per receipt';
  end if;

  insert into public.purchase_receipts (
    purchase_id,
    request_key,
    notes,
    received_by
  )
  values (
    p_purchase_id,
    p_request_key,
    p_notes,
    auth.uid()
  )
  returning id into v_receipt_id;

  for v_item in
    select x.purchase_item_id, x.quantity, x.batch_code, x.expires_on,
      pi.product_id
    from jsonb_to_recordset(p_items)
      as x(purchase_item_id uuid, quantity numeric, batch_code text, expires_on date)
    join public.purchase_items pi on pi.id = x.purchase_item_id
    order by pi.product_id, pi.id
  loop
    if v_item.quantity is null or v_item.quantity <= 0
      or v_item.quantity::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Receipt quantities must be greater than zero';
    end if;

    select pi.* into v_purchase_item
    from public.purchase_items pi
    where pi.id = v_item.purchase_item_id
      and pi.purchase_id = p_purchase_id
    for update;

    if not found
      or v_purchase_item.received_quantity + v_item.quantity
        > v_purchase_item.ordered_quantity then
      raise exception 'Receipt quantity exceeds the remaining ordered quantity';
    end if;

    select p.id, p.tracks_inventory, p.tracks_batches,
      p.average_cost, u.decimal_places
    into v_product
    from public.products p
    join public.units u on u.id = p.unit_id
    where p.id = v_purchase_item.product_id
    for update of p;

    if round(v_item.quantity, v_product.decimal_places) <> v_item.quantity then
      raise exception 'Receipt quantity exceeds the precision allowed by the unit';
    end if;

    v_effective_cost := greatest(
      v_purchase_item.unit_cost
        - v_purchase_item.discount_amount / v_purchase_item.ordered_quantity,
      0
    );
    v_batch_id := null;

    if v_product.tracks_batches then
      if nullif(btrim(v_item.batch_code), '') is null then
        raise exception 'Batch-tracked product receipts require a batch code';
      end if;

      insert into public.product_batches (
        product_id,
        batch_code,
        expires_on,
        quantity_received,
        quantity_remaining,
        unit_cost
      )
      values (
        v_product.id,
        btrim(v_item.batch_code),
        v_item.expires_on,
        v_item.quantity,
        0,
        v_effective_cost
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
    elsif nullif(btrim(v_item.batch_code), '') is not null
      or v_item.expires_on is not null then
      raise exception 'Batch details supplied for a product without batch tracking';
    end if;

    insert into public.purchase_receipt_items (
      receipt_id,
      purchase_item_id,
      quantity,
      unit_cost,
      batch_id
    )
    values (
      v_receipt_id,
      v_purchase_item.id,
      v_item.quantity,
      v_effective_cost,
      v_batch_id
    )
    returning id into v_receipt_item_id;

    if v_product.tracks_inventory then
      insert into public.inventory (product_id, quantity_on_hand)
      values (v_product.id, 0)
      on conflict (product_id) do nothing;

      select i.quantity_on_hand into v_old_quantity
      from public.inventory i
      where i.product_id = v_product.id
      for update;

      v_old_average_cost := v_product.average_cost;
      v_new_quantity := v_old_quantity + v_item.quantity;

      perform public._record_stock_change(
        v_product.id,
        v_item.quantity,
        'purchase_receipt',
        'purchase_receipt_item',
        v_receipt_item_id,
        auth.uid(),
        p_request_key,
        v_line_index,
        'Purchase receipt',
        v_batch_id,
        null,
        null,
        v_effective_cost
      );

      update public.products
      set purchase_price = v_effective_cost,
          average_cost = case
            when v_new_quantity = 0 then v_effective_cost
            else (
              v_old_quantity * v_old_average_cost
                + v_item.quantity * v_effective_cost
            ) / v_new_quantity
          end
      where id = v_product.id;
    else
          update public.products
          set purchase_price = v_effective_cost,
              average_cost = v_effective_cost
          where id = v_product.id;
    end if;

    update public.purchase_items
    set received_quantity = received_quantity + v_item.quantity
    where id = v_purchase_item.id;

    v_line_index := v_line_index + 1;
  end loop;

  if exists (
    select 1 from public.purchase_items pi
    where pi.purchase_id = p_purchase_id
      and pi.received_quantity < pi.ordered_quantity
  ) then
    update public.purchases
    set status = 'partially_received'
    where id = p_purchase_id;
  else
    update public.purchases
    set status = 'received'
    where id = p_purchase_id;
  end if;

  return v_receipt_id;
end;
$$;

create or replace function public.record_purchase_payment(
  p_request_key uuid,
  p_purchase_id uuid,
  p_amount numeric,
  p_payment_method_code text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_payment_id uuid;
  v_method_id uuid;
  v_purchase_status text;
  v_total numeric(14, 2);
  v_paid numeric(14, 2);
begin
  if auth.uid() is null
    or not public.current_user_has_permission('purchasing.pay') then
    raise exception 'Permission denied: purchasing.pay';
  end if;

  if p_request_key is null or p_amount is null or p_amount <= 0
    or p_amount::text in ('NaN', 'Infinity', '-Infinity')
    or round(p_amount, 2) <> p_amount then
    raise exception 'Invalid purchase payment';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select pp.id into v_payment_id
  from public.purchase_payments pp
  where pp.request_key = p_request_key;

  if v_payment_id is not null then
    return v_payment_id;
  end if;

  select p.status into v_purchase_status
  from public.purchases p
  where p.id = p_purchase_id
  for update;

  if not found then
    raise exception 'Purchase does not exist';
  end if;

  if v_purchase_status = 'cancelled' then
    raise exception 'Purchase does not accept payments';
  end if;

  select coalesce(sum(pi.line_total), 0)::numeric(14, 2)
  into v_total
  from public.purchase_items pi
  where pi.purchase_id = p_purchase_id;

  select coalesce(sum(pp.amount), 0)::numeric(14, 2)
  into v_paid
  from public.purchase_payments pp
  where pp.purchase_id = p_purchase_id;

  if p_amount > v_total - v_paid then
    raise exception 'Payment exceeds the outstanding purchase amount';
  end if;

  select pm.id into v_method_id
  from public.payment_methods pm
  where pm.code = p_payment_method_code and pm.is_active;

  if v_method_id is null then
    raise exception 'Unknown or inactive payment method';
  end if;

  insert into public.purchase_payments (
    purchase_id,
    payment_method_id,
    request_key,
    amount,
    reference,
    recorded_by
  )
  values (
    p_purchase_id,
    v_method_id,
    p_request_key,
    p_amount,
    nullif(btrim(p_reference), ''),
    auth.uid()
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

create or replace function public.request_sales_return(
  p_request_key uuid,
  p_sale_id uuid,
  p_reason text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_return_id uuid;
  v_sale public.sales%rowtype;
  v_sale_item public.sale_items%rowtype;
  v_product record;
  v_item record;
  v_reserved numeric(18, 3);
  v_sold_from_batch numeric(18, 3);
  v_already_returned_batch numeric(18, 3);
  v_return_unit_cost numeric(14, 4);
begin
  if auth.uid() is null
    or not public.current_user_has_permission('sales_returns.request') then
    raise exception 'Permission denied: sales_returns.request';
  end if;

  if p_request_key is null
    or nullif(btrim(p_reason), '') is null
    or coalesce(jsonb_typeof(p_items), '') <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'Invalid sales return request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

  select sr.id into v_return_id
  from public.sales_returns sr
  where sr.request_key = p_request_key;

  if v_return_id is not null then
    return v_return_id;
  end if;

  select s.* into v_sale
  from public.sales s
  where s.id = p_sale_id
  for update;

  if not found then
    raise exception 'Sale does not exist';
  end if;

  if v_sale.status in ('voided', 'refunded') then
    raise exception 'Sale cannot be returned';
  end if;

  if v_sale.cashier_id <> auth.uid()
    and not public.current_user_has_permission('sales_returns.manage_all') then
    raise exception 'Permission denied: return is for another cashier''s sale';
  end if;

  insert into public.sales_returns (
    request_key,
    sale_id,
    reason,
    requested_by
  )
  values (
    p_request_key,
    p_sale_id,
    btrim(p_reason),
    auth.uid()
  )
  returning id into v_return_id;

  for v_item in
    select
      (x.value ->> 'sale_item_id')::uuid as sale_item_id,
      (x.value ->> 'quantity')::numeric as quantity,
      x.value ->> 'condition' as condition,
      coalesce((x.value ->> 'restock_to_inventory')::boolean, false)
        as restock_to_inventory,
      nullif(x.value ->> 'batch_id', '')::uuid as batch_id
    from jsonb_array_elements(p_items) as x(value)
  loop
    if v_item.quantity is null or v_item.quantity <= 0
      or v_item.quantity::text in ('NaN', 'Infinity', '-Infinity')
      or v_item.condition is null
      or v_item.condition not in ('sellable', 'damaged', 'expired', 'quarantine')
      or (v_item.restock_to_inventory and v_item.condition <> 'sellable') then
      raise exception 'Invalid returned quantity, condition, or restock option';
    end if;

    select si.* into v_sale_item
    from public.sale_items si
    where si.id = v_item.sale_item_id
      and si.sale_id = p_sale_id
    for update;

    if not found then
      raise exception 'Return item does not belong to this sale';
    end if;

    v_return_unit_cost := v_sale_item.unit_cost_snapshot;

    select coalesce(sum(sri.quantity), 0)
    into v_reserved
    from public.sales_return_items sri
    join public.sales_returns sr on sr.id = sri.sales_return_id
    where sri.sale_item_id = v_sale_item.id
      and sr.status in ('pending', 'approved');

    if v_reserved + v_item.quantity > v_sale_item.quantity then
      raise exception 'Return quantity exceeds the quantity sold';
    end if;

    select p.tracks_batches, p.tracks_inventory, u.decimal_places
    into v_product
    from public.products p
    join public.units u on u.id = p.unit_id
    where p.id = v_sale_item.product_id
    for share;

    if round(v_item.quantity, v_product.decimal_places) <> v_item.quantity then
      raise exception 'Return quantity exceeds the precision allowed by the unit';
    end if;

    if v_item.restock_to_inventory and not v_product.tracks_inventory then
      raise exception 'This product does not track inventory';
    end if;

    if v_item.restock_to_inventory and v_product.tracks_batches then
      if v_item.batch_id is null then
        raise exception 'A batch is required to restock this product';
      end if;

      select coalesce(sum(-sm.quantity_delta), 0)
      into v_sold_from_batch
      from public.stock_movements sm
      where sm.source_type = 'sale_item'
        and sm.source_id = v_sale_item.id
        and sm.batch_id = v_item.batch_id
        and sm.movement_type = 'sale';

      select coalesce(sum(sri.quantity), 0)
      into v_already_returned_batch
      from public.sales_return_items sri
      join public.sales_returns sr on sr.id = sri.sales_return_id
      where sri.sale_item_id = v_sale_item.id
        and sri.batch_id = v_item.batch_id
        and sri.restock_to_inventory
        and sr.status in ('pending', 'approved');

      if not exists (
        select 1 from public.product_batches b
        where b.id = v_item.batch_id
          and b.product_id = v_sale_item.product_id
          and (b.expires_on is null or b.expires_on >= public.business_today())
      ) or v_already_returned_batch + v_item.quantity > v_sold_from_batch then
        raise exception 'Returned batch was not sold on this line or is expired';
      end if;

      select coalesce(
        round(
          sum(-sm.quantity_delta * sm.unit_cost)
            / nullif(sum(-sm.quantity_delta), 0),
          4
        )::numeric(14, 4),
        v_sale_item.unit_cost_snapshot
      )
      into v_return_unit_cost
      from public.stock_movements sm
      where sm.source_type = 'sale_item'
        and sm.source_id = v_sale_item.id
        and sm.batch_id = v_item.batch_id
        and sm.movement_type = 'sale';
    elsif v_item.batch_id is not null then
      raise exception 'Batch identifiers are only valid for sellable items being restocked';
    end if;

    insert into public.sales_return_items (
      sales_return_id,
      sale_item_id,
      quantity,
      condition,
      restock_to_inventory,
      batch_id,
      unit_price_snapshot,
      unit_cost_snapshot,
      discount_per_unit_snapshot
    )
    values (
      v_return_id,
      v_sale_item.id,
      v_item.quantity,
      v_item.condition,
      v_item.restock_to_inventory,
      v_item.batch_id,
      v_sale_item.unit_price,
      v_return_unit_cost,
      v_sale_item.discount_amount / v_sale_item.quantity
    );
  end loop;

  return v_return_id;
end;
$$;

create or replace function public.approve_sales_return(
  p_return_id uuid,
  p_refund_payment_method_code text default null,
  p_cash_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_return public.sales_returns%rowtype;
  v_sale public.sales%rowtype;
  v_item record;
  v_method_id uuid;
  v_method_is_cash boolean;
  v_session_cashier uuid;
  v_return_amount numeric(14, 2);
  v_credit_adjustment numeric(14, 2);
  v_refund numeric(14, 2);
  v_previous_returns numeric(14, 2);
  v_item_index integer := 0;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('sales_returns.approve') then
    raise exception 'Permission denied: sales_returns.approve';
  end if;

  select sr.* into v_return
  from public.sales_returns sr
  where sr.id = p_return_id
  for update;

  if not found then
    raise exception 'Sales return does not exist';
  end if;

  if v_return.status = 'approved' then
    return v_return.id;
  end if;

  if v_return.status <> 'pending' then
    raise exception 'Only pending returns can be approved';
  end if;

  select s.* into v_sale
  from public.sales s
  where s.id = v_return.sale_id
  for update;

  if not found then
    raise exception 'Original sale does not exist';
  end if;

  select coalesce(round(sum(
    si.line_total
      * (ri.quantity / si.quantity)
      * s.total_amount
      / nullif((
        select sum(si2.line_total)
        from public.sale_items si2
        where si2.sale_id = s.id
      ), 0)
  ), 2), 0)::numeric(14, 2)
  into v_return_amount
  from public.sales_return_items ri
  join public.sale_items si on si.id = ri.sale_item_id
  join public.sales s on s.id = v_return.sale_id
  where ri.sales_return_id = v_return.id;

  select coalesce(sum(sr.return_amount), 0)::numeric(14, 2)
  into v_previous_returns
  from public.sales_returns sr
  where sr.sale_id = v_sale.id
    and sr.status = 'approved'
    and sr.id <> v_return.id;

  if v_previous_returns + v_return_amount > v_sale.total_amount then
    raise exception 'Approved returns cannot exceed the original sale total';
  end if;

  v_credit_adjustment := least(v_return_amount, v_sale.balance_due);
  v_refund := v_return_amount - v_credit_adjustment;

  if v_refund > v_sale.amount_paid then
    raise exception 'Refund exceeds the amount paid for this sale';
  end if;

  if v_credit_adjustment > 0 and v_sale.customer_id is null then
    raise exception 'A customer is required to adjust an outstanding balance';
  end if;

  if v_refund > 0 then
    select pm.id, pm.is_cash into v_method_id, v_method_is_cash
    from public.payment_methods pm
    where pm.code = p_refund_payment_method_code
      and pm.is_active;

    if v_method_id is null then
      raise exception 'An active refund payment method is required';
    end if;

    if v_method_is_cash then
      if p_cash_session_id is null then
        raise exception 'Cash refunds require an open cash session';
      end if;

      select cs.cashier_id into v_session_cashier
      from public.cash_sessions cs
      where cs.id = p_cash_session_id
        and cs.closed_at is null
      for update;

      if v_session_cashier is null
        or (
          v_session_cashier <> auth.uid()
          and not public.current_user_has_permission('cash_sessions.manage_all')
        ) then
        raise exception 'An authorized open cash session is required';
      end if;
    end if;
  end if;

  for v_item in
    select ri.id, ri.sale_item_id, ri.quantity, ri.restock_to_inventory,
      ri.batch_id, ri.sales_return_id, si.product_id,
      ri.unit_cost_snapshot as original_unit_cost,
      row_number() over (order by ri.id)::integer - 1 as line_index
    from public.sales_return_items ri
    join public.sale_items si on si.id = ri.sale_item_id
    where ri.sales_return_id = v_return.id
    order by ri.id
  loop
    if v_item.restock_to_inventory then
      if v_item.batch_id is not null and not exists (
        select 1 from public.product_batches b
        where b.id = v_item.batch_id
          and (b.expires_on is null or b.expires_on >= public.business_today())
      ) then
        raise exception 'Expired products cannot be returned to available stock';
      end if;

      perform public._record_stock_change(
        v_item.product_id,
        v_item.quantity,
        'customer_return',
        'sales_return_item',
        v_item.id,
        auth.uid(),
        v_return.request_key,
        v_item.line_index,
        'Sellable customer return',
        v_item.batch_id,
        null,
        null,
        v_item.original_unit_cost
      );
    end if;

    v_item_index := v_item_index + 1;
  end loop;

  update public.sales
  set amount_paid = amount_paid - v_refund,
      return_adjusted_amount = return_adjusted_amount + v_return_amount,
      status = case
        when v_previous_returns + v_return_amount >= total_amount then 'refunded'
        else 'partially_refunded'
      end
  where id = v_sale.id;

  update public.sales_returns
  set status = 'approved',
      return_amount = v_return_amount,
      refund_amount = v_refund,
      credit_adjustment_amount = v_credit_adjustment,
      refund_payment_method_id = case when v_refund > 0 then v_method_id end,
      cash_session_id = case
        when v_refund > 0 and v_method_is_cash then p_cash_session_id
      end,
      approved_by = auth.uid(),
      approved_at = now()
  where id = v_return.id;

  if v_credit_adjustment > 0 then
    insert into public.customer_transactions (
      customer_id,
      transaction_type,
      amount,
      sale_id,
      sales_return_id,
      request_key,
      note,
      recorded_by
    )
    values (
      v_sale.customer_id,
      'return_credit',
      -v_credit_adjustment,
      v_sale.id,
      v_return.id,
      v_return.request_key,
      'Credit adjustment for approved return',
      auth.uid()
    );
  end if;

  return v_return.id;
end;
$$;

create or replace function public.reject_sales_return(
  p_return_id uuid,
  p_rejection_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_return public.sales_returns%rowtype;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('sales_returns.approve') then
    raise exception 'Permission denied: sales_returns.approve';
  end if;

  if nullif(btrim(p_rejection_reason), '') is null then
    raise exception 'A rejection reason is required';
  end if;

  select sr.* into v_return
  from public.sales_returns sr
  where sr.id = p_return_id
  for update;

  if not found then
    raise exception 'Sales return does not exist';
  end if;

  if v_return.status = 'rejected' then
    return v_return.id;
  end if;

  if v_return.status <> 'pending' then
    raise exception 'Only pending returns can be rejected';
  end if;

  update public.sales_returns
  set status = 'rejected',
      rejection_reason = btrim(p_rejection_reason),
      rejected_at = now()
  where id = v_return.id;

  return v_return.id;
end;
$$;
