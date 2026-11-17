# Sabit Super Store MIS database

## Design and relationships

The database keeps authentication credentials in Supabase Auth and uses
`public.profiles.id` as a one-to-one foreign key to `auth.users.id`. A profile
references one role; roles are connected to permissions through
`role_permissions`. The seed creates `Admin` and `Cashier`. New Auth users are
created as inactive cashiers until an administrator explicitly assigns their
role and activates them.

The product catalog links products to optional categories and brands and to a
required unit. Categories can form a parent/child tree. Products may have
multiple barcodes and one translation per supported language (`en`, `fa`, or
`ps`). Inventory is a current quantity projection; the append-only
`stock_movements` ledger records each quantity change. Batch-tracked products
also use `product_batches` for expiry-aware stock and cost data.

Purchases belong to suppliers and contain purchase items. Receiving creates a
purchase receipt and receipt-item rows, adds inventory/batch stock, and updates
the weighted average product cost atomically. Purchase payments form a
separate payment ledger. Supplier balances are derived rather than stored.

Sales are associated with a cashier and open cash session, and optionally a
customer. A sale contains item and payment rows. The item captures product,
price, and cost snapshots; stock movements tie sale items to batches when
applicable. Returns reference original sale items and are approved separately.
Only sellable return items explicitly marked for restock increase inventory.
Customer balances are derived from customer transactions, not copied into a
mutable balance column.

Expenses reference expense categories. A monthly budget has a unique
year/month and category allocations; allocation guards prevent the allocated
total from exceeding the monthly budget. Reporting views calculate actual
spending, remaining budget, utilization, and over-budget status from recorded
expenses. Activity logs record administrative and operational changes without
copying sensitive row contents. Notifications belong to a profile.

## Tables

### Staff and authorization

| Table | Purpose and relationships |
| --- | --- |
| `profiles` | Employee display/contact/language/active data; primary key references `auth.users.id`, and `role_id` references `roles`. No password or Auth secret is stored here. |
| `roles` | Named authorization groups, seeded with Admin and Cashier. |
| `permissions` | Permission-code catalog used by RLS and RPC functions. |
| `role_permissions` | Join table between roles and permissions; composite primary key prevents duplicate assignments. |

### Store configuration

| Table | Purpose and relationships |
| --- | --- |
| `store_settings` | Singleton store identity, logo path, address, tax, currency, timezone, and default language. Seed defaults are AFN and Asia/Kabul. |
| `system_settings` | Key/value JSON settings for system options. |
| `payment_methods` | Configurable payment methods referenced by sale, purchase, expense, and customer ledgers. Cash methods drive cash-session totals. |
| `receipt_settings` | Singleton receipt text, visibility, and language options. |

### Catalog and inventory

| Table | Purpose and relationships |
| --- | --- |
| `categories` | Product category tree; `parent_id` references another category. |
| `brands` | Product brands. |
| `units` | Quantity units and permitted decimal precision (0–3 places). |
| `products` | SKU, descriptive fields, price, cost, unit, category/brand references, inventory flags, image path, and low-stock threshold. |
| `product_barcodes` | Multiple unique barcodes per product; a partial unique index allows at most one primary barcode per product. |
| `product_translations` | Product name/description per supported language; unique by product and language. |
| `inventory` | One current on-hand quantity per product; only stock functions update it. |
| `product_batches` | Batch/expiry and remaining quantity/cost for batch-tracked products. |
| `stock_movements` | Append-only stock ledger with signed quantity, movement type, source, actor, optional batch, and idempotency key. |

### Suppliers and purchasing

| Table | Purpose and relationships |
| --- | --- |
| `suppliers` | Supplier identity and contact information. |
| `purchases` | Supplier invoice/order header and workflow status. |
| `purchase_items` | Product lines, ordered/received quantities, unit cost, and discount snapshots. |
| `purchase_receipts` | Idempotent receipt header created when goods are received. |
| `purchase_receipt_items` | Received quantity, actual cost, and optional batch per purchase line. |
| `purchase_payments` | Supplier payments, payment method, reference, and idempotency key. |

### POS and customers

| Table | Purpose and relationships |
| --- | --- |
| `cash_sessions` | Cashier opening float, open/close state, expected/count/difference cash. A partial unique index allows one open session per cashier. |
| `sales` | Sale header, unique receipt and request keys, cashier/session/customer references, totals, paid amount, and return-adjusted balance. |
| `sale_items` | Sale line and product/price/cost snapshots; the cost snapshot reflects the actual consumed batch costs when batch tracking is enabled. |
| `sale_payments` | Split payments for a sale; each payment references its method and cash session where applicable. |
| `customers` | Customer contact information and active state. |
| `customer_transactions` | Append-only signed customer-credit/payment/return ledger. Customer balance is its sum. |

### Expenses, budgets, returns, and operations

| Table | Purpose and relationships |
| --- | --- |
| `expense_categories` | Configurable expense categories, including seeded salaries, rent, electricity, transportation, maintenance, utilities, and other. |
| `expenses` | Dated business expenses, amount, payment method, recorder, and recorded/voided state. |
| `monthly_budgets` | One budget per calendar month and year, enforced by a unique constraint. |
| `monthly_budget_items` | One allocation per expense category in a budget; a trigger prevents allocations exceeding the budget. |
| `sales_returns` | Idempotent return request, approval/rejection state, reason, refund, and credit-adjustment data. |
| `sales_return_items` | Returned quantity, condition, original price/cost snapshots, sale item, and explicit sellable-restock decision. |
| `activity_logs` | Read-only audit history of important changes; actor and entity references are retained where available. |
| `notifications` | Per-employee notification content and read timestamp. Users can read and mark only their own notifications. |

All tables use UUID primary keys except the singleton settings keys and lookup
codes. Monetary values use `NUMERIC`; prices and costs retain four fractional
digits and posted totals use two. Quantities use `NUMERIC(18,3)`. Foreign keys
restrict deletion of records used by financial and stock history.

## Reporting views

- `supplier_balances`: received purchase value, supplier payments, and derived
  balance; permission-filtered to administrators.
- `customer_balances`: derived customer transaction balance; permission-filtered
  to administrators. Cashiers with `customers.balance.read` use
  `get_customer_balance(customer_id)`.
- `low_stock_products`: active inventory-tracked products at/below their minimum
  quantity, including products without an inventory row (treated as zero).
- `monthly_budget_summary`: total allocation, actual spending, remaining amount,
  utilization, and over-budget flag.
- `monthly_budget_category_summary`: budget-versus-actual figures per category.
- `sales_profit_summary`: sales, approved returns, historical cost of goods
  sold, and gross profit. It is permission-filtered to administrators.
- `admin_product_costs`, `admin_product_batch_costs`, and
  `admin_stock_movement_costs`: cost details exposed only to users with the
  corresponding catalog/inventory permissions.

Views that rely on the caller's row-level policies use PostgreSQL 15+
`security_invoker`. Sensitive cost views use `security_barrier` and explicit
permission checks. Cashiers can read selling/catalog and inventory fields but
cannot directly select product purchase/average cost, batch cost, stock
movement cost, or sale-item cost snapshots.

## Transactions and protected operations

Authenticated clients should use these RPCs for protected writes. They are
atomic, validate permissions and inputs, and use request UUIDs where retries
must be idempotent.

| Function | Operation |
| --- | --- |
| `open_cash_session(request_key, opening_float)` | Opens the caller's cash session. |
| `close_cash_session(session_id, counted_cash)` | Closes an authorized session and calculates expected cash and difference. |
| `complete_sale(request_key, session_id, customer_id, items, payments, header_discount)` | Creates sale/items/payments, applies stock movements, and records customer credit in one transaction. |
| `record_customer_payment(request_key, customer_id, amount, method_code, session_id, sale_id, reference, note)` | Records an account payment and optionally settles a specific sale balance. |
| `get_customer_balance(customer_id)` | Returns the permission-checked balance from the customer ledger. |
| `receive_purchase(request_key, purchase_id, items, notes)` | Receives ordered quantities, creates receipt/batch/stock rows, and updates weighted average cost atomically. |
| `record_purchase_payment(request_key, purchase_id, amount, method_code, reference)` | Records a partial or final supplier payment. |
| `adjust_inventory(product_id, quantity_delta, movement_type, note, request_key, batch_code, expires_on)` | Applies a validated adjustment, damage, or expiry movement. |
| `request_sales_return(request_key, sale_id, reason, items)` | Reserves eligible quantities in a pending return request. |
| `approve_sales_return(return_id, refund_method_code, cash_session_id)` | Approves a pending return, refunds/adjusts credit, and restocks only sellable items selected for restock. |
| `reject_sales_return(return_id, rejection_reason)` | Rejects a pending return with a required reason. |
| `admin_update_employee(employee_id, role_code, display_name, employee_code, phone, language, is_active)` | Updates employee access and protects the last active administrator. |
| `admin_create_notification(user_id, title, body, category, data)` | Creates a notification for an active employee. |

`complete_sale` accepts item objects with `product_id`, `quantity`, and
optional `discount_amount`; payment objects contain `method_code`, `amount`,
and optional `reference`. Prices are read from the database, not trusted from
the client. `receive_purchase` accepts items with `purchase_item_id`,
`quantity`, and optional `batch_code`/`expires_on`. Return items contain
`sale_item_id`, `quantity`, `condition`, optional `restock_to_inventory`, and
optional `batch_id`.

Direct client writes to sales, sale payments, stock movements, inventory,
purchase receipts/payments, customer ledgers, and return approvals are not
granted. Do not bypass these operations with a service-role key from browser
code.

## Role and row-security summary

- **Admin:** seeded with every permission. Can manage employees, settings,
  catalog, inventory, purchasing, customers, sales, expenses, budgets, returns,
  and audit/reporting data.
- **Cashier:** can read catalog and inventory, operate their own cash session,
  create/read their own sales, create/read customers for POS, record customer
  payments, request returns for their own sales, and read their own
  notifications. They cannot manage employees/settings, purchasing, expenses,
  budgets, or approvals.
- **Inactive profiles:** cannot satisfy permission checks. Auth metadata never
  assigns roles or activates profiles.
- **Anonymous users:** have no access to the application schema or RPCs.

RLS is enabled on every application table. Financial data and employee profiles
are permission-filtered; ledger mutation privileges are withheld. The
`service_role` bypasses RLS by design and must remain server-side.

## Operational notes

The `store_settings` singleton is seeded with AFN, Asia/Kabul, English, and a
zero tax rate. Local Supabase setup runs `seed.sql` after migrations. A hosted
project requires applying the seed separately. Logo/image paths refer to
Supabase Storage objects; bucket creation and Storage object policies are a
separate deployment decision and are not implicitly opened by these database
migrations.
