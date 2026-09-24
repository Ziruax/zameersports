"use client";

import { useEffect } from "react";
import ProductThumb from "../ProductThumb";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/use-catalog";
import { usePathRoute } from "@/hooks/use-path-route";
import { cartCount, cartSubtotal, useCartStore, type CartItem } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

const DEFAULT_THRESHOLD = 5000;
const DEFAULT_SHIPPING_FEE = 250;

function QtyStepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Quantity: ${qty}`}>
      <Button
        type="button"
        variant="outline"
        className="size-11"
        onClick={() => onChange(qty - 1)}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" aria-hidden="true" />
      </Button>
      <span className="w-10 text-center text-base font-bold text-neutral-900" aria-live="polite">
        {qty}
      </span>
      <Button
        type="button"
        variant="outline"
        className="size-11"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CartRow({
  item,
  onSetQty,
  onRemove,
}: {
  item: CartItem;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const maxQty = Math.max(1, Math.min(item.stock || 10, 10));
  return (
    <li className="flex gap-3 p-4 sm:gap-4 sm:p-5">
      <ProductThumb
        src={item.image}
        alt={item.name}
        sizes="96px"
        className="size-20 rounded-lg sm:size-24"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <a
              href={`/product/${item.slug}`}
              className="line-clamp-2 text-sm font-semibold text-neutral-900 hover:text-emerald-700"
            >
              {item.name}
            </a>
            <p className="mt-0.5 text-xs text-neutral-500">{formatPrice(item.price)} each</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.name}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QtyStepper qty={item.qty} max={maxQty} onChange={onSetQty} />
          <p className="text-base font-semibold text-neutral-900">
            {formatPrice(item.price * item.qty)}
          </p>
        </div>
      </div>
    </li>
  );
}

function ClearCartButton({ onClear }: { onClear: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Clear cart
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear cart?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes all items from your cart. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onClear}
            className="bg-red-600 font-semibold text-white hover:bg-red-700"
          >
            Clear Cart
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CartView() {
  const { navigate } = usePathRoute();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const { data: settings } = useSettings();

  const threshold = Number.parseInt(settings?.free_shipping_threshold ?? "", 10) || DEFAULT_THRESHOLD;
  const shippingFee = Number.parseInt(settings?.shipping_fee ?? "", 10) || DEFAULT_SHIPPING_FEE;

  const subtotal = cartSubtotal(items);
  const count = cartCount(items);
  const freeShipping = subtotal >= threshold;
  const total = subtotal + (freeShipping ? 0 : shippingFee);
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  useEffect(() => {
    document.title = "Your Cart | Zameer Sports";
  }, []);

  if (items.length === 0) {
    return (
      <section
        className="container flex flex-col items-center justify-center gap-4 py-20 text-center lg:py-28"
        aria-label="Cart"
      >
        <ShoppingBag className="size-16 text-neutral-300" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold tracking-wide text-neutral-900 uppercase sm:text-3xl">
          Your cart is empty
        </h1>
        <p className="max-w-md text-neutral-500">
          Gear up with Pakistan&apos;s best sports equipment.
        </p>
        <Button
          type="button"
          onClick={() => navigate("/shop")}
          className="mt-2 h-12 bg-emerald-700 px-8 text-base font-semibold text-white hover:bg-emerald-800"
        >
          Start Shopping
        </Button>
      </section>
    );
  }

  return (
    <section className="container py-8 lg:py-12" aria-label="Cart">
      <h1 className="font-display text-2xl font-bold tracking-wide text-neutral-900 uppercase sm:text-3xl">
        Your Cart{" "}
        <span className="text-base font-semibold tracking-normal text-neutral-500 normal-case">
          ({count} item{count === 1 ? "" : "s"})
        </span>
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <Card className="scrollbar-slim max-h-[60vh] gap-0 overflow-y-auto p-0 py-0 lg:max-h-none lg:overflow-visible">
            <ul className="divide-y divide-neutral-100">
              {items.map((item) => (
                <CartRow
                  key={item.productId}
                  item={item}
                  onSetQty={(qty) => setQty(item.productId, qty)}
                  onRemove={() => remove(item.productId)}
                />
              ))}
            </ul>
          </Card>
          <div className="mt-4 flex items-center justify-between">
            <Button asChild variant="ghost" className="h-11 font-semibold">
              <a href="/shop" aria-label="Continue shopping">
                Continue Shopping
              </a>
            </Button>
            <ClearCartButton onClear={clear} />
          </div>
        </div>

        {/* Summary */}
        <aside>
          <Card className="flex flex-col gap-5 p-6 lg:sticky lg:top-28">
            <h2 className="font-display text-xl font-bold tracking-wide text-neutral-900 uppercase">
              Order Summary
            </h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold text-neutral-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Shipping</span>
                {freeShipping ? (
                  <span className="font-bold text-emerald-700">FREE</span>
                ) : (
                  <span className="font-semibold text-neutral-900">{formatPrice(shippingFee)}</span>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900">Total</span>
              <span className="text-xl font-bold text-neutral-900">{formatPrice(total)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <Progress value={progress} aria-label="Progress towards free delivery" />
              <p className="text-xs font-medium">
                {freeShipping ? (
                  <span className="font-semibold text-emerald-700">
                    You&apos;ve unlocked FREE delivery
                  </span>
                ) : (
                  <span className="text-neutral-600">
                    {formatPrice(threshold - subtotal)} away from FREE delivery!
                  </span>
                )}
              </p>
            </div>

            <Button
              asChild
              className="h-12 w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
            >
              <a href="/checkout" aria-label="Proceed to checkout">
                Proceed to Checkout
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="ghost" className="h-11 w-full font-semibold">
              <a href="/shop" aria-label="Continue shopping">
                Continue Shopping
              </a>
            </Button>

            <p className="text-center text-xs text-neutral-500">
              Cash on Delivery available &bull; Prices include all taxes
            </p>
          </Card>
        </aside>
      </div>
    </section>
  );
}
