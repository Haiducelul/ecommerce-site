"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, PackageCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_VALUES,
  formatOrderStatus,
  getStatusBadgeClass,
  getStatusDotClass,
  type OrderStatus,
} from "@/lib/orderStatus";
import { generatePDF } from "@/utils/generatePDF";

type AdminOrderItem = {
  name: string;
  quantity: number;
  unit_price: string;
};

type AdminOrder = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  user_email: string | null;
  items: AdminOrderItem[];
  payment_method?: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShippingLine(order: AdminOrder): string | null {
  const parts = [order.shipping_address?.trim(), order.shipping_city?.trim()].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function OrdersPageClient() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("toate");

  const isEmpty = !loading && orders.length === 0;

  const filteredOrders = statusFilter === "toate" 
    ? orders 
    : orders.filter((order) => order.status === statusFilter);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Nu s-au putut încărca comenzile.");
        return;
      }
      setOrders(
        (data.orders ?? []).map((o: AdminOrder) => ({
          ...o,
          items: o.items ?? [],
        }))
      );
    } catch {
      toast("Eroare de rețea la încărcarea comenzilor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const prev = orders;
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    setUpdatingId(orderId);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrders(prev);
        toast(data.error ?? "Actualizarea statusului a eșuat.");
        return;
      }
      toast("Status comandă actualizat.");
    } catch {
      setOrders(prev);
      toast("Eroare de rețea. Încearcă din nou.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Comenzi
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? "Se încarcă…"
              : isEmpty
              ? "Nu există comenzi în sistem."
              : `${orders.length} comand${orders.length !== 1 ? "e" : "ă"} în sistem`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium text-slate-600">
            Filtrare status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a]"
          >
            <option value="toate">Toate</option>
            {ORDER_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
          Se încarcă comenzile…
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <PackageCheck className="size-8 text-slate-400" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">Nicio comandă momentan</p>
            <p className="mt-1 text-sm text-slate-500">
              Când clienții plasează comenzi, vor apărea aici.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  {["ID Comandă", "Client", "Total", "Data", "Detalii", "Status"].map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const shippingLine = formatShippingLine(order);
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <Fragment key={order.id}>
                    <tr className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-slate-600">
                          {order.id.slice(0, 8)}…
                        </p>
                      </td>

                      <td className="max-w-[220px] px-5 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {order.full_name?.trim() || "Client necunoscut"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {order.user_email ?? "email indisponibil"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatPrice(Number(order.total_amount))}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm tabular-nums text-slate-600">
                          {formatDate(order.created_at)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderId(isExpanded ? null : order.id)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#22624a] shadow-sm transition-colors hover:border-[#a8d7c5] hover:bg-[#edf5f1]"
                        >
                          Detalii
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex min-w-[100px] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(order.status)}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${getStatusDotClass(order.status)}`}
                            />
                            {formatOrderStatus(order.status)}
                          </span>

                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] disabled:opacity-50"
                          >
                            {ORDER_STATUS_VALUES.map((status) => (
                              <option key={status} value={status}>
                                {formatOrderStatus(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${order.id}-details`} className="bg-slate-50/80">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Produse comandate
                            </p>
                            {order.items.length > 0 ? (
                              <ul className="space-y-1.5">
                                {order.items.map((item, index) => (
                                  <li
                                    key={`${order.id}-item-${index}`}
                                    className="text-sm text-slate-700"
                                  >
                                    {item.name} - {item.quantity} buc
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">
                                Niciun produs înregistrat pentru această comandă.
                              </p>
                            )}

                            <div className="my-4 border-b border-gray-200" />

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Adresă de livrare
                                </p>
                                <p className="text-sm text-slate-700">
                                  {shippingLine || "Adresă indisponibilă"}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Metodă de plată
                                </p>
                                <p className="text-sm text-slate-700">
                                  {order.payment_method || "Ramburs la curier"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Telefon client
                              </p>
                              <p className="text-sm text-slate-700">
                                {order.phone?.trim() || "Telefon indisponibil"}
                              </p>
                            </div>

                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => generatePDF(order)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-[#a8d7c5] hover:bg-[#edf5f1] hover:text-[#22624a]"
                              >
                                <Download className="size-4" aria-hidden />
                                Generează chitanță
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {filteredOrders.length} comand{filteredOrders.length !== 1 ? "e" : "ă"} afișat{filteredOrders.length !== 1 ? "e" : "ă"}
              {statusFilter !== "toate" && ` (din ${orders.length} total)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
