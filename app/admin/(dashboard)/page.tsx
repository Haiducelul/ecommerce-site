import { headers } from "next/headers";
import {
  Users,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
} from "lucide-react";
import pool from "@/db";
import RevenueChart from "@/components/admin/RevenueChart";
import OrderStatusChart from "@/components/admin/OrderStatusChart";
import TopProductsChart from "@/components/admin/TopProductsChart";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatCard = {
  label:       string;
  value:       number;
  icon:        React.ElementType;
  iconBg:      string;
  iconColor:   string;
  description: string;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchStats() {
  try {
    // Use pool.query() for each call so every query gets its own connection
    // from the pool — running them on a single client in parallel is not
    // supported by pg and triggers a deprecation warning.
    const [users, products, orders, reviews] = await Promise.all([
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM users    WHERE role = 'customer'"),
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM products"),
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM orders"),
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM reviews"),
    ]);

    return {
      users:    Number(users.rows[0].count),
      products: Number(products.rows[0].count),
      orders:   Number(orders.rows[0].count),
      reviews:  Number(reviews.rows[0].count),
    };
  } catch (err) {
    console.error("[admin/page] fetchStats error:", err);
    return { users: 0, products: 0, orders: 0, reviews: 0 };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const [h, stats] = await Promise.all([headers(), fetchStats()]);
  const adminName  = h.get("x-admin-name") ?? "Administrator";

  const STAT_CARDS: StatCard[] = [
    {
      label:       "Utilizatori",
      value:       stats.users,
      icon:        Users,
      iconBg:      "bg-[#edf5f1]",
      iconColor:   "text-[#22624a]",
      description: "Clienți înregistrați",
    },
    {
      label:       "Produse",
      value:       stats.products,
      icon:        Package,
      iconBg:      "bg-violet-50",
      iconColor:   "text-violet-600",
      description: "Produse în catalog",
    },
    {
      label:       "Comenzi",
      value:       stats.orders,
      icon:        ShoppingCart,
      iconBg:      "bg-emerald-50",
      iconColor:   "text-emerald-600",
      description: "Total comenzi plasate",
    },
    {
      label:       "Recenzii",
      value:       stats.reviews,
      icon:        Star,
      iconBg:      "bg-amber-50",
      iconColor:   "text-amber-600",
      description: "Recenzii lăsate de clienți",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Bine ai venit, {adminName}!
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, iconBg, iconColor, description }) => (
          <div
            key={label}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className={`flex size-10 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`size-5 ${iconColor}`} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900">
                {value.toLocaleString("ro-RO")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart - Full width */}
      <RevenueChart />

      {/* Status and Top Products Charts - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderStatusChart />
        <TopProductsChart />
      </div>

      {/* Empty-state hint */}
      {Object.values(stats).every((v) => v === 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-[#d4ebe2] bg-[#edf5f1] px-5 py-4">
          <TrendingUp className="mt-0.5 size-5 shrink-0 text-[#379b72]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[#143827]">Baza de date este goală</p>
            <p className="mt-0.5 text-xs text-[#22624a]">
              Rulează{" "}
              <code className="rounded bg-[#d4ebe2] px-1 py-0.5 font-mono text-[#143827]">
                node scripts/createAdmin.js
              </code>{" "}
              și importă produse pentru a vedea statistici reale.
            </p>
          </div>
        </div>
      )}

      {/* Quick-nav cards */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800">Acțiuni rapide</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/products", label: "Gestionează produse", icon: Package,      color: "text-violet-600", bg: "bg-violet-50"  },
            { href: "/admin/orders",   label: "Vezi comenzi",        icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
            { href: "/admin/users",    label: "Vezi utilizatori",    icon: Users,        color: "text-[#22624a]",    bg: "bg-[#edf5f1]"    },
          ].map(({ href, label, icon: Icon, color, bg }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`size-4 ${color}`} strokeWidth={2} aria-hidden />
              </div>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
