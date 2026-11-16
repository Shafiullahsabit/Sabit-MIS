import {
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export const modules = [
  { key: "pos", label: "POS", href: "/pos", icon: CreditCard },
  { key: "products", label: "Products", href: "/products", icon: Package },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: Boxes },
  { key: "suppliers", label: "Suppliers", href: "/suppliers", icon: Truck },
  { key: "purchases", label: "Purchases", href: "/purchases", icon: ShoppingCart },
  { key: "customers", label: "Customers", href: "/customers", icon: Users },
  { key: "sales", label: "Sales", href: "/sales", icon: CircleDollarSign },
  { key: "expenses", label: "Expenses", href: "/expenses", icon: Wallet },
  {
    key: "reports",
    label: "Reports",
    href: "/reports",
    icon: ChartNoAxesCombined,
  },
  {
    key: "employees",
    label: "Employees",
    href: "/employees",
    icon: BriefcaseBusiness,
  },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings2 },
];
export const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Store operations",
    items: [
      modules[0],
      modules[1],
      modules[2],
      modules[4],
      modules[3],
      modules[5],
      modules[6],
    ],
  },
  {
    label: "Business",
    items: [modules[7], modules[8], modules[9], modules[10]],
  },
];
