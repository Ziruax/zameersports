"use client";

import ProductThumb from "./ProductThumb";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

interface CartDrawerProps {
  settings: Record<string, string>;
}

/** Slide-in cart drawer (right side) driven by the cart store drawerOpen flag. */
export default function CartDrawer({ settings }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const drawerOpen = useCartStore((s) => s.drawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  const subtotal = cartSubtotal(items);
  const threshold = Number(settings.free_shipping_threshold) || 5000;

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => (open ? null : closeDrawer())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle className="font-display flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <ShoppingCart className="size-5 text-emerald-700" aria-hidden="true" />
            Your Cart
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {items.length}
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review the items in your shopping cart and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="size-12 text-neutral-300" aria-hidden="true" />
            <p className="font-semibold text-neutral-700">Your cart is empty</p>
            <p className="text-sm text-neutral-500">
              Cricket bats, footballs, badminton and more await.
            </p>
            <Button
              asChild
              className="mt-2 h-11 bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
            >
              <a
                href="#/shop"
                onClick={closeDrawer}
                aria-label="Start shopping, browse the full store"
              >
                Start shopping
              </a>
            </Button>
          </div>
        ) : (
          <>
            <div className="scrollbar-slim max-h-96 flex-1 overflow-y-auto p-4">
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <ProductThumb
                      src={item.image}
                      alt={item.name}
                      sizes="64px"
                      className="size-16 rounded-lg"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <a
                        href={`#/product/${item.slug}`}
                        onClick={closeDrawer}
                        className="line-clamp-2 text-sm font-semibold text-neutral-900 hover:text-emerald-700"
                      >
                        {item.name}
                      </a>
                      <p className="text-sm font-bold text-emerald-700">
                        {formatPrice(item.price)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1" aria-label={`Quantity: ${item.qty}`}>
                          <button
                            type="button"
                            onClick={() => setQty(item.productId, item.qty - 1)}
                            aria-label="Decrease quantity"
                            className="flex size-8 items-center justify-center rounded-md border text-neutral-700 hover:bg-neutral-100"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.productId, item.qty + 1)}
                            aria-label="Increase quantity"
                            className="flex size-8 items-center justify-center rounded-md border text-neutral-700 hover:bg-neutral-100"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.productId)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-bold text-neutral-900">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {subtotal >= threshold
                  ? "You have unlocked FREE delivery"
                  : `FREE delivery on orders over ${formatPrice(threshold)}`}
              </p>
              <Separator className="my-3" />
              <div className="flex flex-col gap-2">
                <Button
                  asChild
                  className="h-11 w-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
                >
                  <a href="#/checkout" onClick={closeDrawer} aria-label="Go to checkout">
                    Checkout
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full font-semibold">
                  <a href="#/cart" onClick={closeDrawer} aria-label="View full cart">
                    View Cart
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
