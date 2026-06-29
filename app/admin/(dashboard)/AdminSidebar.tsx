"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin",          label: "Dashboard",   icon: LayoutDashboard, exact: true  },
  { href: "/admin/products", label: "Produse",     icon: Package,         exact: false },
  { href: "/admin/orders",   label: "Comenzi",     icon: ShoppingCart,    exact: false },
  { href: "/admin/reviews",  label: "Recenzii",    icon: Star,            exact: false },
  { href: "/admin/users",    label: "Utilizatori", icon: Users,           exact: false },
];

type Props = {
  adminName:  string;
  adminEmail: string;
};

export default function AdminSidebar({ adminName, adminEmail }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center border-b border-slate-200 px-5 py-5">
        <span className="text-base font-bold tracking-tight text-slate-900">
          BuildTech Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#edf5f1] text-[#1a4d3a]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("size-4 shrink-0", active ? "text-[#22624a]" : "text-slate-400")}
                strokeWidth={active ? 2.25 : 2}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{adminName}</p>
          <p className="truncate text-xs text-slate-500">{adminEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
