export const dashboardStats = [
  {
    key: "revenue",
    value: 128450,
    trend: 0.128,
    trendDirection: "up",
  },
  {
    key: "orders",
    value: 248,
    trend: 0.082,
    trendDirection: "up",
  },
  {
    key: "average",
    value: 518,
    trend: 0.024,
    trendDirection: "down",
  },
  {
    key: "stock",
    value: 12,
    trendDirection: "down",
  },
];

export const revenueByPeriod = {
  week: [
    { dayKey: "monday", revenue: 68400 },
    { dayKey: "tuesday", revenue: 79200 },
    { dayKey: "wednesday", revenue: 71800 },
    { dayKey: "thursday", revenue: 93400 },
    { dayKey: "friday", revenue: 86700 },
    { dayKey: "saturday", revenue: 116300 },
    { dayKey: "sunday", revenue: 128450 },
  ],
  month: [
    { day: 1, revenue: 62100 },
    { day: 3, revenue: 74600 },
    { day: 6, revenue: 69800 },
    { day: 9, revenue: 103200 },
    { day: 11, revenue: 89100 },
    { day: 14, revenue: 119600 },
    { day: 16, revenue: 128450 },
  ],
};

export const recentSales = [
  {
    id: "SL-2481",
    customerKey: "sample.walkInCustomer",
    customerKey: "sample.walkInCustomer",
    initials: "WC",
    time: "10:42",
    amount: 2850,
    statusKey: "common.paid",
  },
  {
    id: "SL-2480",
    customerKey: "sample.ahmadRahimi",
    initials: "AR",
    time: "10:36",
    amount: 12400,
    statusKey: "common.paid",
  },
  {
    id: "SL-2479",
    customerKey: "sample.fatimaSediqi",
    initials: "FS",
    time: "10:21",
    amount: 5680,
    statusKey: "common.paid",
  },
  {
    id: "SL-2478",
    customerKey: "sample.walkInCustomer",
    initials: "WC",
    time: "10:08",
    amount: 1790,
    statusKey: "common.paid",
  },
];

export const bestSellers = [
  { key: "rice", nameKey: "products.rice", initials: "RI", units: 86 },
  { key: "oil", nameKey: "products.oil", initials: "CO", units: 72 },
  { key: "tea", nameKey: "products.tea", initials: "TE", units: 64 },
];

export const lowStockProducts = [
  {
    nameKey: "products.milk",
    categoryKey: "products.dairy",
    stock: 4,
  },
  {
    nameKey: "products.flour",
    categoryKey: "products.grains",
    stock: 6,
  },
];
