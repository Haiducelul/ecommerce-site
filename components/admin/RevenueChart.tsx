"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueData {
  date: string;
  revenue: string;
}

type TimeRange = "1" | "7" | "30";

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("7");

  useEffect(() => {
    async function fetchRevenue() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/revenue?range=${timeRange}`);
        const json = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch revenue data:", json.error);
          return;
        }

        // Format the data for the chart
        const formattedData = json.data.map((item: { date: string; revenue: string }) => {
          let formattedDate: string;
          if (timeRange === "1") {
            // Hour-based: show as "HH:00"
            const hour = parseInt(item.date, 10);
            formattedDate = `${hour.toString().padStart(2, "0")}:00`;
          } else {
            // Day-based: show as "DD MMM"
            formattedDate = new Date(item.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
          }

          return {
            date: formattedDate,
            revenue: parseFloat(item.revenue),
          };
        });

        setData(formattedData);
      } catch (err) {
        console.error("Error fetching revenue data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRevenue();
  }, [timeRange]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="text-sm text-slate-500">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Grafic vânzări</h3>
        <div className="flex gap-2">
          {[
            { value: "1" as TimeRange, label: "Ultima zi" },
            { value: "7" as TimeRange, label: "7 zile" },
            { value: "30" as TimeRange, label: "30 zile" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTimeRangeChange(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === value
                  ? "bg-[#22624a] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22624a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22624a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval={0}
              angle={timeRange === "30" ? -45 : 0}
              textAnchor={timeRange === "30" ? "end" : "middle"}
              height={timeRange === "30" ? 60 : 30}
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
              formatter={(value: number) => [`${value.toFixed(2)} Lei`, "Venit"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#22624a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
