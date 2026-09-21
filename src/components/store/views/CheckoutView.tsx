"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Landmark, Loader2, MessageCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useHashRoute } from "@/hooks/use-hash-route";
import { useSettings } from "@/hooks/use-checkout";
import { ApiError, api } from "@/lib/api";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- validation */

const PAKISTANI_PHONE_RE = /^(\+92|0)?[0-9]{10}$/;

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z
    .string()
    .trim()
    .regex(PAKISTANI_PHONE_RE, "Enter a valid Pakistani phone (03XXXXXXXXX)"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  address: z.string().trim().min(8, "Enter your complete delivery address").max(500),
  city: z.string().trim().min(2, "Enter your city").max(60),
  notes: z.string().trim().max(500, "Notes are too long"),
  paymentMethod: z.enum(["cod", "bank"]),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

interface OrderAck {
  orderNumber: string;
  subtotal: number;
  shipping: number;
  total: number;
}

/* Cart persistence uses skipHydration — subscribe to the store's hydration
   flag with useSyncExternalStore so we never flash the empty-cart state. */
const subscribeCartHydrated = (onStoreChange: () => void) =>
  useCartStore.persist.onFinishHydration(onStoreChange);
const getCartHydrated = () => useCartStore.persist.hasHydrated();
const getServerCartHydrated = () => false;

/* -------------------------------------------------------------------- view */

export default function CheckoutView() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const { navigate } = useHashRoute();
  const settings = useSettings();

  const cartHydrated = useSyncExternalStore(
    subscribeCartHydrated,
    getCartHydrated,
    getServerCartHydrated,
  );
  const [placing, setPlacing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    document.title = "Checkout | Zameer Sports";
  }, []);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      city: "Dinga",
      notes: "",
      paymentMethod: "cod",
    },
  });

  const subtotal = cartSubtotal(items);
  const threshold = Number(settings.free_shipping_threshold) || 5000;
  const fee = Number(settings.shipping_fee) || 250;
  const shipping = subtotal >= threshold ? 0 : fee;
  const total = subtotal + shipping;
  const freeShipping = shipping === 0;
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" }) ?? "cod";

  /* ------------------------------------------------------------- states */

  if (!cartHydrated) {
    return (
      <section className="container py-16" aria-label="Checkout">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-neutral-100" />
          <div className="h-64 rounded-xl bg-neutral-100" />
        </div>
      </section>
    );
  }

  if (redirecting) {
    return (
      <section className="container py-24" aria-label="Placing your order">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-emerald-700" aria-hidden="true" />
          <p className="text-lg font-semibold text-neutral-900">Placing your order…</p>
          <p className="text-neutral-500">Taking you to your confirmation.</p>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="container py-16" aria-label="Checkout">
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-5 px-6 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100">
              <ShoppingBag className="size-8 text-neutral-400" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-neutral-900">
                Your cart is empty
              </h1>
              <p className="text-neutral-500">
                Your cart is empty, add some gear first and come back to place your order.
              </p>
            </div>
            <Button asChild className="h-11 px-8 font-semibold">
              <a href="#/shop">Shop Sports Gear</a>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  /* -------------------------------------------------------------- submit */

  const onSubmit = async (values: CheckoutValues) => {
    if (items.length === 0 || placing || redirecting) return;
    setPlacing(true);
    try {
      const ack = await api<OrderAck>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: values.fullName,
          phone: values.phone,
          email: values.email,
          address: values.address,
          city: values.city,
          notes: values.notes,
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      clear();
      setRedirecting(true);
      toast.success("Order placed!");
      navigate(`#/success/${ack.orderNumber}`);
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Something went wrong, please try again. Your cart is safe.";
      toast.error(message);
      setPlacing(false);
    }
  };

  /* -------------------------------------------------------------- render */

  return (
    <section className="container py-8 sm:py-12" aria-label="Checkout">
      <h1 className="font-display mb-6 text-3xl font-bold uppercase tracking-wide text-neutral-900">
        Checkout
      </h1>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* ------------------------------------------------ delivery form */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl uppercase tracking-wide">
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="name"
                            placeholder="e.g. Ali Raza"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="03XXXXXXXXX"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="font-normal text-neutral-400">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="street-address"
                          placeholder="House / street / landmark, nearest chowk"
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Dinga" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Order Notes{" "}
                          <span className="font-normal text-neutral-400">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Any delivery instructions?"
                            className="min-h-11 resize-y"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors",
                              paymentMethod === "cod"
                                ? "border-emerald-700 bg-emerald-50"
                                : "border-neutral-200 hover:border-neutral-300",
                            )}
                          >
                            <RadioGroupItem value="cod" className="mt-0.5" />
                            <Banknote
                              className="mt-0.5 size-5 shrink-0 text-emerald-700"
                              aria-hidden="true"
                            />
                            <span className="space-y-1">
                              <span className="block font-semibold text-neutral-900">
                                Cash on Delivery
                              </span>
                              <span className="block text-sm leading-snug text-neutral-500">
                                Pay cash when your order arrives, trusted all over Pakistan
                              </span>
                            </span>
                          </label>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors",
                              paymentMethod === "bank"
                                ? "border-emerald-700 bg-emerald-50"
                                : "border-neutral-200 hover:border-neutral-300",
                            )}
                          >
                            <RadioGroupItem value="bank" className="mt-0.5" />
                            <Landmark
                              className="mt-0.5 size-5 shrink-0 text-emerald-700"
                              aria-hidden="true"
                            />
                            <span className="space-y-1">
                              <span className="block font-semibold text-neutral-900">
                                Bank Transfer
                              </span>
                              <span className="block text-sm leading-snug text-neutral-500">
                                We&apos;ll WhatsApp you bank details after you order
                              </span>
                            </span>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={placing}
                  className="h-12 w-full bg-emerald-700 text-base font-bold text-white hover:bg-emerald-800"
                >
                  {placing ? (
                    <>
                      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                      Placing Order…
                    </>
                  ) : (
                    `Place Order (${formatPrice(total)})`
                  )}
                </Button>

                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1 text-sm text-neutral-500">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-700" aria-hidden="true" />
                    Secure
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="size-4 text-emerald-700" aria-hidden="true" />
                    COD
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-4 text-emerald-700" aria-hidden="true" />
                    WhatsApp Support
                  </span>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ------------------------------------------------ order summary */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-xl uppercase tracking-wide">
                Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="max-h-72 space-y-3 overflow-y-auto scrollbar-slim pr-1" aria-label="Order items">
                {items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3">
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

              <div className="space-y-2 border-t border-neutral-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-medium text-neutral-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Shipping</span>
                  {freeShipping ? (
                    <span className="font-bold text-emerald-700">FREE</span>
                  ) : (
                    <span className="font-medium text-neutral-900">{formatPrice(shipping)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-4">
                <span className="font-semibold text-neutral-900">Total</span>
                <span className="text-xl font-bold text-neutral-900">{formatPrice(total)}</span>
              </div>

              <p className="text-xs leading-relaxed text-neutral-500">
                You&apos;ll pay on delivery. No advance payment needed.
                {freeShipping
                  ? ` Your order qualifies for FREE Pakistan-wide delivery (over ${formatPrice(threshold)}).`
                  : ` Add ${formatPrice(threshold - subtotal)} more for FREE delivery.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
