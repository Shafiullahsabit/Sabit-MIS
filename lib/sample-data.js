export const dashboardStats = [
  {
    key: "revenue",
    label: "Today's revenue",
    value: 128450,
    trend: "12.8%",
    trendDirection: "up",
  },
  {
    key: "orders",
    label: "Total orders",
    value: 248,
    trend: "8.2%",
    trendDirection: "up",
  },
  {
    key: "average",
    label: "Average order value",
    value: 518,
    trend: "2.4%",
    trendDirection: "down",
  },
  {
    key: "stock",
    label: "Low stock items",
    value: 12,
    trend: "3 need attention",
    trendDirection: "down",
    comparison: "review today",
  },
];

export const revenueByPeriod = {
  week: [
    { label: "Mon", revenue: 68400 },
    { label: "Tue", revenue: 79200 },
    { label: "Wed", revenue: 71800 },
    { label: "Thu", revenue: 93400 },
    { label: "Fri", revenue: 86700 },
    { label: "Sat", revenue: 116300 },
    { label: "Sun", revenue: 128450 },
  ],
  month: [
    { label: "Nov 1", revenue: 62100 },
    { label: "Nov 3", revenue: 74600 },
    { label: "Nov 6", revenue: 69800 },
    { label: "Nov 9", revenue: 103200 },
    { label: "Nov 11", revenue: 89100 },
    { label: "Nov 14", revenue: 119600 },
    { label: "Nov 16", revenue: 128450 },
  ],
};

export const recentSales = [
  {
    id: "SL-2481",
    customer: "Walk-in customer",
    initials: "WC",
    time: "10:42 AM",
    amount: 2850,
    status: "Paid",
  },
  {
    id: "SL-2480",
    customer: "Ahmad Rahimi",
    initials: "AR",
    time: "10:36 AM",
    amount: 12400,
    status: "Paid",
  },
  {
    id: "SL-2479",
    customer: "Fatima Sediqi",
    initials: "FS",
    time: "10:21 AM",
    amount: 5680,
    status: "Paid",
  },
  {
    id: "SL-2478",
    customer: "Walk-in customer",
    initials: "WC",
    time: "10:08 AM",
    amount: 1790,
    status: "Paid",
  },
];

export const bestSellers = [
  { name: "Premium basmati rice · 5kg", initials: "RI", units: 86 },
  { name: "Afghan cooking oil · 2L", initials: "CO", units: 72 },
  { name: "Black tea · 500g", initials: "TE", units: 64 },
];

export const lowStockProducts = [
  { name: "Dairy milk · 1L", category: "Dairy & chilled", stock: 4 },
  { name: "Wheat flour · 10kg", category: "Grains & staples", stock: 6 },
];
