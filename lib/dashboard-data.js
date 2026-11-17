import "server-only";

const PAGE_SIZE = 1000;
const DEFAULT_TIME_ZONE = "Asia/Kabul";
const REVENUE_STATUSES = ["completed", "partially_refunded"];

async function fetchAllPages(buildQuery) {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(
      offset,
      offset + PAGE_SIZE - 1,
    );

    if (error) throw error;

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function getDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
}

function addCalendarDays({ year, month, day }, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}
function dateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function startOfLocalDayUtc({ year, month, day }, timeZone) {
  const targetWallTime = Date.UTC(year, month - 1, day);
  let timestamp = targetWallTime;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, Number(value)]),
    );
    const representedWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    timestamp += targetWallTime - representedWallTime;
  }

  return new Date(timestamp);
}

function netSaleAmount(sale) {
  return Math.max(
    0,
    Number(sale.total_amount) - Number(sale.return_adjusted_amount ?? 0),
  );
}

function aggregateSalesByDay(sales, timeZone) {
  const totals = new Map();

  for (const sale of sales) {
    const key = dateKey(getDateParts(new Date(sale.sold_at), timeZone));
    const current = totals.get(key) ?? { revenue: 0, orders: 0 };

    current.revenue += netSaleAmount(sale);
    current.orders += 1;
    totals.set(key, current);
  }

  return totals;
}

function aggregateSalesByHour(sales, timeZone) {
  const totals = Array.from({ length: 24 }, () => 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  });

  for (const sale of sales) {
    const hour = Number(
      formatter
        .formatToParts(new Date(sale.sold_at))
        .find(({ type }) => type === "hour").value,
    );

    totals[hour] += netSaleAmount(sale);
  }

  return totals.map((revenue, hour) => ({ hour, revenue }));
}

function makeDailySeries(days, totals) {
  return days.map((parts) => ({
    date: dateKey(parts),
    revenue: totals.get(dateKey(parts))?.revenue ?? 0,
  }));
}

function percentageChange(current, previous) {
  return previous > 0 ? (current - previous) / previous : null;
}

async function fetchSaleItems(supabase, saleIds) {
  const chunks = [];

  for (let index = 0; index < saleIds.length; index += 100) {
    chunks.push(saleIds.slice(index, index + 100));
  }

  const rows = [];
  for (let index = 0; index < chunks.length; index += 5) {
    const batch = await Promise.all(
      chunks.slice(index, index + 5).map((saleIdChunk) =>
        fetchAllPages(() =>
          supabase
            .from("sale_items")
            .select("sale_id,product_name_snapshot,quantity")
            .in("sale_id", saleIdChunk)
            .order("sale_id")
            .order("id"),
        ),
      ),
    );
    rows.push(...batch.flat());
  }

  return rows;
}

function makeBestSellers(items) {
  const totals = new Map();

  for (const item of items) {
    const name = item.product_name_snapshot?.trim();
    if (!name) continue;

    totals.set(name, (totals.get(name) ?? 0) + Number(item.quantity));
  }

  return [...totals.entries()]
    .map(([name, units]) => ({
      name,
      units,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toLocaleUpperCase(),
    }))
    .sort((left, right) => right.units - left.units || left.name.localeCompare(right.name))
    .slice(0, 3);
}

function getSaleStatusKey(sale) {
  if (sale.status === "voided") return "voided";
  if (sale.status === "refunded") return "refunded";
  if (sale.status === "partially_refunded") return "partiallyRefunded";
  if (Number(sale.balance_due) > 0) return "balanceDue";
  return "completed";
}

export async function getHourlyRevenueForDate(supabase, requestedDate) {
  const day = parseDateKey(requestedDate);
  if (!day) return null;

  const { data: storeSettings, error: settingsError } = await supabase
    .from("store_settings")
    .select("timezone_name")
    .eq("singleton", true)
    .maybeSingle();

  if (settingsError) throw settingsError;

  const timeZone = storeSettings?.timezone_name || DEFAULT_TIME_ZONE;
  const now = new Date();
  const today = getDateParts(now, timeZone);
  if (dateKey(day) > dateKey(today)) return null;

  const dayStart = startOfLocalDayUtc(day, timeZone);
  const nextDayStart = startOfLocalDayUtc(addCalendarDays(day, 1), timeZone);
  const dayEnd = new Date(
    Math.min(nextDayStart.getTime(), now.getTime()),
  ).toISOString();
  const sales = await fetchAllPages(() =>
    supabase
      .from("sales")
      .select("total_amount,return_adjusted_amount,sold_at")
      .in("status", REVENUE_STATUSES)
      .gte("sold_at", dayStart.toISOString())
      .lt("sold_at", dayEnd)
      .order("sold_at"),
  );

  return aggregateSalesByHour(sales, timeZone);
}

export async function getDashboardData(supabase) {
  const { data: storeSettings, error: settingsError } = await supabase
    .from("store_settings")
    .select("timezone_name")
    .eq("singleton", true)
    .maybeSingle();

  if (settingsError) throw settingsError;

  const timeZone = storeSettings?.timezone_name || DEFAULT_TIME_ZONE;
  const now = new Date();
  const today = getDateParts(now, timeZone);
  const yesterday = addCalendarDays(today, -1);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(today, index - 6),
  );
  const monthDays = Array.from({ length: today.day }, (_, index) => ({
    year: today.year,
    month: today.month,
    day: index + 1,
  }));
  const rangeStart = [weekDays[0], monthDays[0]].sort(
    (left, right) =>
      Date.UTC(left.year, left.month - 1, left.day) -
      Date.UTC(right.year, right.month - 1, right.day),
  )[0];
  const startIso = startOfLocalDayUtc(rangeStart, timeZone).toISOString();
  const nowIso = now.toISOString();

  const salesQuery = () =>
    supabase
      .from("sales")
      .select("id,total_amount,return_adjusted_amount,status,sold_at")
      .in("status", REVENUE_STATUSES)
      .gte("sold_at", startIso)
      .lt("sold_at", nowIso)
      .order("sold_at")
      .order("id");

  const [sales, recentResult, inventoryPermissionResult] = await Promise.all([
    fetchAllPages(salesQuery),
    supabase
      .from("sales")
      .select("id,receipt_number,total_amount,status,balance_due,sold_at,customer_id")
      .order("sold_at", { ascending: false })
      .limit(5),
    supabase.rpc("current_user_has_permission", {
      p_permission_code: "inventory.read",
    }),
  ]);

  if (recentResult.error) throw recentResult.error;
  if (inventoryPermissionResult.error) throw inventoryPermissionResult.error;

  const recentRows = recentResult.data ?? [];
  const canReadInventory = inventoryPermissionResult.data === true;
  const currentDateKey = dateKey(today);
  const previousDateKey = dateKey(yesterday);
  const salesByDay = aggregateSalesByDay(sales, timeZone);
  const todayTotals = salesByDay.get(currentDateKey) ?? { revenue: 0, orders: 0 };
  const yesterdayTotals = salesByDay.get(previousDateKey) ?? {
    revenue: 0,
    orders: 0,
  };
  const weeklySales = sales.filter(
    (sale) =>
      dateKey(getDateParts(new Date(sale.sold_at), timeZone)) >=
      dateKey(weekDays[0]),
  );
  const customerIds = [
    ...new Set(recentRows.map((sale) => sale.customer_id).filter(Boolean)),
  ];

  const [saleItems, lowStockResult, customersResult] = await Promise.all([
    fetchSaleItems(
      supabase,
      weeklySales.map((sale) => sale.id),
    ),
    canReadInventory
      ? supabase
          .from("low_stock_products")
          .select("product_id,sku,name,quantity_on_hand", { count: "exact" })
          .order("name")
          .limit(5)
      : Promise.resolve(null),
    customerIds.length
      ? supabase.from("customers").select("id,full_name").in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (lowStockResult?.error) throw lowStockResult.error;
  if (customersResult.error) throw customersResult.error;

  const customerNames = new Map(
    (customersResult.data ?? []).map((customer) => [
      customer.id,
      customer.full_name,
    ]),
  );
  const lowStockProducts =
    lowStockResult?.data?.map((product) => ({
      sku: product.sku,
      name: product.name,
      quantityOnHand: Number(product.quantity_on_hand),
    })) ?? null;

  return {
    timeZone,
    stats: [
      {
        key: "revenue",
        value: todayTotals.revenue,
        trend: percentageChange(todayTotals.revenue, yesterdayTotals.revenue),
      },
      {
        key: "orders",
        value: todayTotals.orders,
        trend: percentageChange(todayTotals.orders, yesterdayTotals.orders),
      },
      {
        key: "average",
        value: todayTotals.orders ? todayTotals.revenue / todayTotals.orders : 0,
        trend: percentageChange(
          todayTotals.orders ? todayTotals.revenue / todayTotals.orders : 0,
          yesterdayTotals.orders
            ? yesterdayTotals.revenue / yesterdayTotals.orders
            : 0,
        ),
      },
      {
        key: "stock",
        value: canReadInventory ? lowStockResult.count ?? 0 : null,
        trend: null,
      },
    ],
    revenueByPeriod: {
      week: makeDailySeries(weekDays, salesByDay),
      month: makeDailySeries(monthDays, salesByDay),
    },
    recentSales: recentRows.map((sale) => ({
      id: String(sale.receipt_number),
      amount: Number(sale.total_amount),
      soldAt: sale.sold_at,
      customerId: sale.customer_id,
      customerName: customerNames.get(sale.customer_id) ?? null,
      statusKey: getSaleStatusKey(sale),
    })),
    bestSellers: makeBestSellers(saleItems),
    lowStockProducts,
    lowStockCount: canReadInventory ? lowStockResult.count ?? 0 : null,
    todayDate: currentDateKey,
  };
}
