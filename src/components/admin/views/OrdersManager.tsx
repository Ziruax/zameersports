"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/admin/StatusBadge";
import { EmptyState, ErrorState, TablePagination, TableSkeleton, waHref } from "@/components/admin/shared";
import {
  ORDER_STATUSES,
  type AdminOrder,
  type AdminOrdersResponse,
  type OrderStatus,
  adminErrorMessage,
  useAdminOrderStatus,
  useAdminOrders,
  useDebouncedValue,
} from "@/hooks/use-admin";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate, formatPrice } from "@/lib/format";

/** Orders section: filterable/searchable table + status-update detail dialog. */
export default function OrdersManager() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [exporting, setExporting] = useState(false);

  const orders = useAdminOrders({ status, search: debouncedSearch, page });

  /** Fetch every order matching the current filters (100 per page) and download as CSV. */
  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const all: AdminOrder[] = [];
      let p = 1;
      for (;;) {
        const qs = new URLSearchParams({ page: String(p), limit: "100" });
        if (status !== "all") qs.set("status", status);
        if (debouncedSearch) qs.set("search", debouncedSearch);
        const res = await api<AdminOrdersResponse>(`/api/admin/orders?${qs.toString()}`);
        all.push(...res.items);
        if (p >= res.pages || res.items.length === 0) break;
        p += 1;
      }
      if (all.length === 0) {
        toast.info("No orders to export for the current filters.");
        return;
      }
      const esc = (v: string | number | null) => {
        const s = String(v ?? "").replace(/"/g, '""');
        return /[",\n\r]/.test(s) ? `"${s}"` : s;
      };
      const header = [
        "Order #",
        "Date",
        "Customer",
        "Phone",
        "City",
        "Address",
        "Items",
        "Subtotal",
        "Discount",
        "Coupon",
        "Shipping",
        "Total",
        "Payment",
        "Status",
        "Notes",
      ];
      const lines = [header.join(",")];
      for (const o of all) {
        lines.push(
          [
            o.orderNumber,
            o.createdAt,
            o.customerName,
            o.phone,
            o.city,
            o.address,
            o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
            o.subtotal,
            o.discount,
            o.couponCode,
            o.shipping,
            o.total,
            o.paymentMethod,
            o.status,
            o.notes,
          ]
            .map(esc)
            .join(","),
        );
      }
      const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zameer-sports-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} order${all.length === 1 ? "" : "s"} to CSV`);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-56 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order #, name, phone, city"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void orders.refetch()}
          disabled={orders.isFetching}
        >
          <RefreshCw className={cn(orders.isFetching && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={() => void exportCsv()}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {orders.isPending ? (
        <TableSkeleton rows={8} />
      ) : orders.isError ? (
        <ErrorState
          error={orders.error}
          onRetry={() => void orders.refetch()}
          label="orders"
        />
      ) : (orders.data?.items.length ?? 0) === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            title="No orders found"
            hint="Try clearing the search or status filter."
          />
        </Card>
      ) : (
        <Card className={cn("rounded-xl p-0", orders.isFetching && "opacity-60")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data?.items.map((order) => (
                  <TableRow key={order.id} className="text-sm">
                    <TableCell className="pl-4 font-mono text-xs font-bold text-neutral-900">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-neutral-500">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-800">{order.customerName}</p>
                      <p className="text-xs text-neutral-400">{order.phone}</p>
                    </TableCell>
                    <TableCell className="text-neutral-600">{order.city}</TableCell>
                    <TableCell className="text-center text-neutral-600">
                      {order.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-neutral-900"
                          onClick={() => setSelected(order)}
                          aria-label={`View order ${order.orderNumber}`}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {waHref(order.phone) ? (
                          <a
                            href={waHref(order.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600"
                            aria-label={`WhatsApp ${order.customerName}`}
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {orders.data ? (
        <TablePagination
          page={orders.data.page}
          pages={orders.data.pages}
          total={orders.data.total}
          onPage={setPage}
          unit="orders"
        />
      ) : null}

      {selected ? (
        <OrderDialog
          key={selected.id}
          order={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="text-sm text-neutral-800">{value || "—"}</p>
    </div>
  );
}

/** Order detail dialog with items, totals and status update (keyed per order). */
function OrderDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const saveStatus = useAdminOrderStatus();
  const [nextStatus, setNextStatus] = useState(order.status);

  async function handleSave() {
    if (!ORDER_STATUSES.includes(nextStatus as OrderStatus)) return;
    try {
      await saveStatus.mutateAsync({ id: order.id, status: nextStatus as OrderStatus });
      toast.success("Status updated");
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3 font-mono">
            {order.orderNumber}
            <StatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Placed {formatDate(order.createdAt)} &middot; Payment:{" "}
            {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-2">
            <InfoRow label="Customer" value={order.customerName} />
            <InfoRow label="Phone" value={order.phone} />
            <InfoRow label="Email" value={order.email} />
            <InfoRow label="City" value={order.city} />
            <div className="sm:col-span-2">
              <InfoRow label="Address" value={order.address} />
            </div>
            {order.notes ? (
              <div className="sm:col-span-2">
                <InfoRow label="Notes" value={order.notes} />
              </div>
            ) : null}
          </div>

          {/* Items */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Items ({order.itemCount})
            </h4>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-3">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="pr-3 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id} className="text-sm">
                      <TableCell className="pl-3">
                        <div className="flex items-center gap-2.5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              loading="lazy"
                              className="size-10 shrink-0 rounded-md border border-neutral-200 object-cover"
                            />
                          ) : null}
                          <span className="max-w-56 truncate font-medium text-neutral-800">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-neutral-600">
                        {item.qty} &times; {formatPrice(item.price)}
                      </TableCell>
                      <TableCell className="text-right text-neutral-600">
                        {formatPrice(item.price)}
                      </TableCell>
                      <TableCell className="pr-3 text-right font-semibold">
                        {formatPrice(item.price * item.qty)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 rounded-lg border border-neutral-200 p-3 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>
                  Coupon{order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
                <span>&minus;{formatPrice(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-neutral-600">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-base font-bold text-neutral-900">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Status update */}
          <div className="flex flex-wrap items-end gap-3 border-t border-neutral-200 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="order-status" className="text-xs text-neutral-500">
                Update status
              </Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger id="order-status" className="w-44 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saveStatus.isPending || nextStatus === order.status}
              onClick={() => void handleSave()}
            >
              {saveStatus.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Save Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
