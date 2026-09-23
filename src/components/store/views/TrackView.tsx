"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MessageCircle,
  PackageSearch,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SectionHeading from "../SectionHeading";
import { useOrderTracking, useSettings, waLink, type TrackedOrder } from "@/hooks/use-checkout";
import { useHashRoute } from "@/hooks/use-hash-route";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------- timeline */

interface StepDef {
  key: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
}

const STEPS: StepDef[] = [
  { key: "pending", label: "Pending", hint: "Order received", Icon: Clock },
  { key: "confirmed", label: "Confirmed", hint: "Confirmed by call or WhatsApp", Icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", hint: "On the way to you", Icon: Truck },
  { key: "delivered", label: "Delivered", hint: "Enjoy your gear", Icon: Home },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-400 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-700 bg-transparent text-emerald-800",
  shipped: "border-amber-500 bg-amber-500 text-white",
  delivered: "border-emerald-700 bg-emerald-700 text-white",
  cancelled: "border-red-600 bg-red-600 text-white",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
        STATUS_BADGE[status] ?? "border-neutral-300 bg-neutral-100 text-neutral-700",
      )}
    >
      {status}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="space-y-0" aria-label="Order status timeline">
      {STEPS.map((step, i) => {
        const completed = currentIdx >= 0 && i < currentIdx;
        const current = i === currentIdx;
        const future = currentIdx >= 0 && i > currentIdx;
        const last = i === STEPS.length - 1;
        return (
          <li key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full border-2",
                  completed && "border-emerald-700 bg-emerald-700 text-white",
                  current &&
                    "border-amber-500 bg-amber-50 text-amber-600 ring-4 ring-amber-200 animate-pulse",
                  future && "border-neutral-200 bg-white text-neutral-400",
                )}
              >
                {completed ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  <step.Icon className="size-5" aria-hidden="true" />
                )}
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cn("h-8 w-0.5", completed ? "bg-emerald-600" : "bg-neutral-200")}
                />
              ) : null}
            </div>
            <div className={cn("pb-8 pt-2", last && "pb-2")}>
              <p
                className={cn(
                  "font-semibold",
                  completed && "text-emerald-800",
                  current && "text-amber-700",
                  future && "text-neutral-400",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {completed ? " (completed)" : current ? " (current status)" : ""}
                </span>
              </p>
              <p className="text-sm text-neutral-500">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------ order card */

function OrderCard({ order }: { order: TrackedOrder }) {
  const settings = useSettings();
  const cancelled = order.status === "cancelled";
  const waHref = waLink(
    settings.whatsapp,
    `Assalam-o-Alaikum! I need help with my order ${order.orderNumber}`,
  );

  return (
    <Card className="mt-8 overflow-hidden">
      <CardContent className="space-y-6 p-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-lg font-bold text-neutral-900">{order.orderNumber}</p>
            <p className="text-sm text-neutral-500">
              Placed {formatDate(order.createdAt)} · {order.customerName}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* cancelled banner or timeline */}
        {cancelled ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <PackageSearch className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-red-800">This order was cancelled.</p>
              <p className="text-sm text-red-700">
                Contact us on{" "}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  WhatsApp
                </a>{" "}
                for help.
              </p>
            </div>
          </div>
        ) : (
          <StatusTimeline status={order.status} />
        )}

        {/* items */}
        <div className="space-y-3 border-t border-neutral-100 pt-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-neutral-400">
            Items
          </h3>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                  <p className="text-sm text-neutral-500">
                    {item.qty} × {formatPrice(item.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-neutral-900">
                  {formatPrice(item.price * item.qty)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* totals */}
        <div className="space-y-2 border-t border-neutral-100 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span className="font-medium text-neutral-900">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">
                Coupon{order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <span className="font-bold text-emerald-700">&minus;{formatPrice(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Shipping</span>
            {order.shipping === 0 ? (
              <span className="font-bold text-emerald-700">FREE</span>
            ) : (
              <span className="font-medium text-neutral-900">{formatPrice(order.shipping)}</span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-2">
            <span className="font-semibold text-neutral-900">Total</span>
            <span className="text-lg font-bold text-neutral-900">{formatPrice(order.total)}</span>
          </div>
        </div>

        <p className="border-t border-neutral-100 pt-4 text-sm text-neutral-500">
          Need help?{" "}
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp us
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ view */

/**
 * TrackView — owns the page title and remounts the form whenever the
 * ?order= query param changes (e.g. arriving from the success screen),
 * which prefills the order number without effects or cascading renders.
 */
export default function TrackView() {
  const { route } = useHashRoute();

  useEffect(() => {
    document.title = "Track Order | Zameer Sports";
  }, []);

  const prefill = route.query.order ? decodeURIComponent(route.query.order) : "";

  return <TrackForm key={prefill} initialOrderNumber={prefill} />;
}

function TrackForm({ initialOrderNumber }: { initialOrderNumber: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isPending, isError, error } = useOrderTracking(orderNumber, phone, submitted);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="container py-8 sm:py-12" aria-label="Track your order">
      <SectionHeading eyebrow="Order Status" title="Track Your Order" />

      <Card className="mx-auto max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="track-order" className="text-sm font-semibold text-neutral-900">
                Order Number
              </label>
              <Input
                id="track-order"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ZSXXXXXXXX or ZSDEMO001"
                className="h-11 font-mono uppercase"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="track-phone" className="text-sm font-semibold text-neutral-900">
                Phone Number
              </label>
              <Input
                id="track-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="03XXXXXXXXX you ordered with"
                className="h-11"
                autoComplete="tel"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full bg-emerald-700 text-base font-bold text-white hover:bg-emerald-800"
            >
              <Search className="size-5" aria-hidden="true" />
              Track Order
            </Button>
            <p className="text-center text-sm text-neutral-500">
              Try demo order <span className="font-mono font-semibold">ZSDEMO001</span> with phone{" "}
              <span className="font-mono font-semibold">03001234501</span>.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* results */}
      {submitted && isPending ? (
        <Card className="mx-auto mt-8 max-w-2xl">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-neutral-500">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <p className="text-sm font-medium">Looking up your order…</p>
            </div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {submitted && isError ? (
        <Card className="mx-auto mt-8 max-w-2xl border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <PackageSearch className="size-6 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                {error instanceof ApiError && error.status === 404
                  ? "Order not found, please check your order number and the phone you used."
                  : "Could not look up your order right now. Please try again in a moment."}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Both fields are required. Need help? WhatsApp us and we will find it for you.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {submitted && data ? (
        <div className="mx-auto max-w-2xl">
          <OrderCard order={data} />
        </div>
      ) : null}
    </section>
  );
}
