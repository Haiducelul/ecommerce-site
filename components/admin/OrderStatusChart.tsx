"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StatusData {
  status: string;
  count: string;
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Plasată": "#3b82f6",      // Blue
  "În procesare": "#eab308", // Yellow
  "Expediată": "#06b6d4",   // Cyan
  "Livrată": "#22c55e",      // Green
  "Anulată": "#ef4444",      // Red
  "Retur": "#f97316",        // Orange
};

const STATUS_LABELS: Record<string, string> = {
  "Plasată": "Plasată",
  "În procesare": "În procesare",
  "Expediată": "Expediată",
  "Livrată": "Livrată",
  "Anulată": "Anulată",
  "Retur": "Retur",
};

export default function OrderStatusChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatusData() {
      try {
        const res = await fetch("/api/admin/order-status");
        const json = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch status data:", json.error);
          return;
        }

        // Format the data for the chart
        const formattedData = json.data.map((item: StatusData) => ({
          name: STATUS_LABELS[item.status] || item.status,
          value: parseInt(item.count, 10),
          fill: STATUS_COLORS[item.status] || "#94a3b8",
        }));

        setData(formattedData);
      } catch (err) {
        console.error("Error fetching status data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatusData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="text-sm text-slate-500">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Status comenzi</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: "#1e293b" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
