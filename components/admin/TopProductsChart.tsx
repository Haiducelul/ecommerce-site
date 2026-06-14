"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ProductData {
  name: string;
  total_sold: string;
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

const PRODUCT_COLORS = [
  "#22624a", // Green
  "#3b82f6", // Blue
  "#eab308", // Yellow
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#0ea5e9", // Sky
  "#84cc16", // Lime
  "#a855f7", // Violet
  "#fb923c", // Orange
  "#2dd4bf", // Teal
  "#f472b6", // Pink
];

const OTHER_COLOR = "#9CA3AF"; // Grey for "Alte produse"

export default function TopProductsChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopProducts() {
      try {
        const res = await fetch("/api/admin/top-products");
        const json = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch top products data:", json.error);
          return;
        }

        // Format the data for the chart
        const rawData = json.data.map((item: ProductData) => ({
          name: item.name,
          value: parseInt(item.total_sold, 10),
        }));

        // Calculate total quantity
        const total = rawData.reduce((sum: number, item: { value: number }) => sum + item.value, 0);

        // Group products with <10% into "Alte produse"
        const significantProducts = rawData.filter((item: { value: number }) => (item.value / total) >= 0.1);
        const otherProducts = rawData.filter((item: { value: number }) => (item.value / total) < 0.1);

        const formattedData: ChartData[] = significantProducts.map((item: { name: string; value: number }, index: number) => ({
          name: item.name,
          value: item.value,
          fill: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
        }));

        // Add "Alte produse" if there are products with <10%
        if (otherProducts.length > 0) {
          const otherTotal = otherProducts.reduce((sum: number, item: { value: number }) => sum + item.value, 0);
          formattedData.push({
            name: "Alte produse",
            value: otherTotal,
            fill: OTHER_COLOR,
          });
        }

        setData(formattedData);
      } catch (err) {
        console.error("Error fetching top products data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopProducts();
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
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Cele mai vândute produse</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name }) => {
                if (name === undefined) return "";
                const truncatedName = name.length > 15 ? `${name.substring(0, 15)}...` : name;
                return truncatedName;
              }}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                if (midAngle === undefined || cx === undefined || cy === undefined || innerRadius === undefined || outerRadius === undefined) {
                  return null;
                }
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#ffffff"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {percent ? (percent * 100).toFixed(0) : 0}%
                  </text>
                );
              }}
              outerRadius={120}
              fill="transparent"
              dataKey="value"
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
