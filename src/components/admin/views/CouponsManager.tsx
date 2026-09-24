"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  TicketPercent,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, EmptyState } from "@/components/admin/shared";
import {
  adminErrorMessage,
  useAdminCouponDelete,
  useAdminCouponSave,
  useAdminCoupons,
  type AdminCoupon,
} from "@/hooks/use-admin";
import { formatPrice } from "@/lib/format";

interface CouponFormState {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrder: string;
  usageLimit: string;
  expiresAt: string;
  active: boolean;
}

const EMPTY_FORM: CouponFormState = {
  code: "",
  type: "percent",
  value: "",
  minOrder: "0",
  usageLimit: "0",
  expiresAt: "",
  active: true,
};

/** Admin Coupons manager: list, create, edit, toggle, delete discount codes. */
export default function CouponsManager() {
  const coupons = useAdminCoupons();
  const del = useAdminCouponDelete();
  const save = useAdminCouponSave();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(c: AdminCoupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder),
      usageLimit: String(c.usageLimit),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      active: c.active,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (form.code.trim().length < 3) next.code = "Code must be at least 3 characters.";
    const v = Number(form.value);
    if (!form.value.trim() || !Number.isFinite(v) || v < 1) {
      next.value = "Enter a value of at least 1.";
    } else if (form.type === "percent" && v > 90) {
      next.value = "Percent discount cannot be more than 90.";
    }
    if (Number(form.minOrder) < 0 || !Number.isFinite(Number(form.minOrder))) {
      next.minOrder = "Enter 0 or more.";
    }
    if (Number(form.usageLimit) < 0 || !Number.isFinite(Number(form.usageLimit))) {
      next.usageLimit = "Enter 0 (unlimited) or more.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const data = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Math.round(Number(form.value)),
      minOrder: Math.round(Number(form.minOrder)),
      usageLimit: Math.round(Number(form.usageLimit)),
      expiresAt: form.expiresAt || "",
      active: form.active,
    };
    try {
      await save.mutateAsync({ id: editing?.id, data });
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setDialogOpen(false);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  async function handleToggleActive(c: AdminCoupon) {
    try {
      await save.mutateAsync({ id: c.id, data: { active: !c.active } });
      toast.success(c.active ? "Coupon deactivated" : "Coupon activated");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success("Coupon deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  if (coupons.isPending) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={openCreate} className="font-semibold">
            <Plus className="size-4" aria-hidden="true" /> Add Coupon
          </Button>
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (coupons.isError) {
    return (
      <ErrorState error={coupons.error} onRetry={() => void coupons.refetch()} label="coupons" />
    );
  }

  const items = coupons.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Create discount codes customers can apply at checkout.
        </p>
        <Button onClick={openCreate} className="font-semibold">
          <Plus className="size-4" aria-hidden="true" /> Add Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={TicketPercent}
                title="No coupons yet"
                hint="Create your first discount code, for example WELCOME10 for 10% off."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => {
                  const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  return (
                    <TableRow key={c.id} className="text-sm">
                      <TableCell className="pl-6 font-mono text-xs font-bold text-neutral-900">
                        {c.code}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-700">
                        {c.type === "percent" ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {c.minOrder > 0 ? formatPrice(c.minOrder) : "None"}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {c.usageLimit > 0 ? `${c.usedCount} / ${c.usageLimit}` : `${c.usedCount} used`}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {expired ? (
                          <span className="font-semibold text-red-600">Expired</span>
                        ) : c.expiresAt ? (
                          new Date(c.expiresAt).toLocaleDateString("en-PK")
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(c)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                            !c.active || expired
                              ? "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {!c.active ? "Inactive" : expired ? "Expired" : "Active"}
                        </button>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(c)}
                            aria-label={`Edit ${c.code}`}
                            className="size-9"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(c)}
                            aria-label={`Delete ${c.code}`}
                            className="size-9 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the discount code details."
                : "Create a discount code customers can apply at checkout."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code">Code *</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME10"
                className="uppercase"
              />
              {errors.code ? <p className="text-xs text-red-600">{errors.code}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-type">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as "percent" | "fixed" }))}
                >
                  <SelectTrigger id="coupon-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (Rs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-value">
                  {form.type === "percent" ? "Percent off *" : "Rs off *"}
                </Label>
                <Input
                  id="coupon-value"
                  type="number"
                  min={1}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percent" ? "e.g. 10" : "e.g. 500"}
                />
                {errors.value ? <p className="text-xs text-red-600">{errors.value}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-min">Min order (Rs)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min={0}
                  value={form.minOrder}
                  onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                />
                {errors.minOrder ? <p className="text-xs text-red-600">{errors.minOrder}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-limit">Usage limit</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="0 = unlimited"
                />
                {errors.usageLimit ? (
                  <p className="text-xs text-red-600">{errors.usageLimit}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-expiry">Expiry date (optional)</Label>
              <Input
                id="coupon-expiry"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5">
              <Label htmlFor="coupon-active">Active</Label>
              <Switch
                id="coupon-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : editing ? (
                "Save Changes"
              ) : (
                "Add Coupon"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-600" aria-hidden="true" />
              Delete coupon?
            </DialogTitle>
            <DialogDescription>
              {deleting
                ? `"${deleting.code}" will stop working immediately for all customers.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={del.isPending}
            >
              {del.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
