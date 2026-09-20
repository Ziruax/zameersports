"use client";

import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { ErrorState } from "@/components/admin/shared";
import { ORDER_STATUSES, useAdminStats } from "@/hooks/use-admin";
import { formatDate, formatPrice } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#059669",
  shipped: "#f97316",
  delivered: "#065f46",
  cancelled: "#a3a3a3",
};

/** Admin dashboard: KPIs, sales chart, status donut, recent orders, low stock. */
export default function DashboardHome({ onGoOrders }: { onGoOrders: () => void }) {
  const stats = useAdminStats();

  if (stats.isPending) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <ErrorState
        error={stats.error}
        onRetry={() => void stats.refetch()}
        label="dashboard stats"
      />
    );
  }

  const d = stats.data;

  const chartData = d.salesByDay.map((point) => {
    const [y, m, day] = point.date.split("-").map(Number);
    const date = new Date(y ?? 0, (m ?? 1) - 1, day ?? 1);
    return {
      ...point,
      label: date.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
    };
  });

  const pieData = ORDER_STATUSES.map((s) => ({
    key: s,
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: d.statusCounts[s],
  })).filter((slice) => slice.value > 0);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Revenue"
          value={formatPrice(d.revenue)}
          icon={TrendingUp}
          tone="emerald"
          hint="Excludes cancelled"
        />
        <StatCard
          label="Orders"
          value={d.ordersCount}
          icon={ShoppingCart}
          tone="emerald"
          hint="All time"
        />
        <StatCard
          label="Pending"
          value={d.pendingCount}
          icon={Clock}
          tone={d.pendingCount > 0 ? "amber" : "emerald"}
          hint="Awaiting confirmation"
        />
        <StatCard
          label="Products"
          value={d.productsCount}
          icon={Boxes}
          tone="emerald"
          hint="Active"
        />
        <StatCard
          label="Low Stock"
          value={d.lowStockCount}
          icon={AlertTriangle}
          tone={d.lowStockCount > 0 ? "red" : "emerald"}
          hint="Stock below 5"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-700">
              Sales &mdash; Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminSalesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#737373" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e5e5" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#737373" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  formatter={(value: number | string) => formatPrice(Number(value))}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#adminSalesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-700">
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((slice) => (
                      <Cell key={slice.key} fill={STATUS_COLORS[slice.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {ORDER_STATUSES.map((s) => (
                <li key={s} className="flex items-center gap-2 text-xs text-neutral-600">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                    aria-hidden="true"
                  />
                  <span className="capitalize">{s}</span>
                  <span className="ml-auto font-semibold text-neutral-800">
                    {d.statusCounts[s]}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + low stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-neutral-700">
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onGoOrders}>
              View all <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.recentOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer text-sm"
                    onClick={onGoOrders}
                  >
                    <TableCell className="pl-6 font-mono text-xs font-bold text-neutral-900">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-36 truncate font-medium text-neutral-800">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-neutral-400">{order.phone}</p>
                    </TableCell>
                    <TableCell className="text-neutral-600">{order.city}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-neutral-500">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-neutral-700">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.lowStock.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500" aria-hidden="true" />
                <p className="text-sm font-medium text-neutral-700">
                  All stock levels healthy
                </p>
                <p className="text-xs text-neutral-400">
                  No active products below 5 units.
                </p>
              </div>
            ) : (
              d.lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded-lg border border-neutral-200 object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                      <Package className="size-4 text-neutral-300" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{p.name}</p>
                    <p className="text-xs text-amber-600">
                      Restock soon &mdash; {p.stock} left
                    </p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {p.stock}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
