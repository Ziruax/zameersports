"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Banknote, Check, Clock, Copy, MessageCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSettings, waLink } from "@/hooks/use-checkout";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* clipboard API unavailable (insecure context / older browser) — fallback */
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function SuccessView({ orderNumber }: { orderNumber: string }) {
  const settings = useSettings();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `Order ${orderNumber} Confirmed | Zameer Sports`;
  }, [orderNumber]);

  const handleCopy = async () => {
    const ok = await copyText(orderNumber);
    if (ok) {
      setCopied(true);
      toast.success("Copied!");
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy — please note down your order number.");
    }
  };

  const waHref = waLink(
    settings.whatsapp,
    `Assalam-o-Alaikum! I just placed order ${orderNumber} on zameersports.shop`,
  );

  return (
    <section className="container py-12 sm:py-16" aria-label="Order confirmation">
      <div className="mx-auto max-w-2xl">
        {/* hero confirmation */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg"
          >
            <Check className="size-10 text-white" strokeWidth={3} aria-hidden="true" />
          </motion.div>
          <h1 className="font-display mt-6 text-3xl font-bold uppercase tracking-wide text-neutral-900 sm:text-4xl">
            Shukriya! Order Placed
          </h1>
          <p className="mt-3 max-w-md text-neutral-500">
            Your order has been received. Hamari team will call or WhatsApp you shortly to confirm.
          </p>
        </div>

        {/* order number */}
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Order Number
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-neutral-900">{orderNumber}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="h-11 gap-2 font-medium"
              aria-label={`Copy order number ${orderNumber}`}
            >
              {copied ? (
                <Check className="size-4 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardContent>
        </Card>
        <p className="mt-3 text-center text-sm text-neutral-500">
          Keep this number to track your order.
        </p>

        {/* info grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 px-4 py-5 text-center">
              <Clock className="size-6 text-emerald-700" aria-hidden="true" />
              <p className="font-semibold text-neutral-900">Confirmation</p>
              <p className="text-sm text-neutral-500">Within a few hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 px-4 py-5 text-center">
              <Truck className="size-6 text-emerald-700" aria-hidden="true" />
              <p className="font-semibold text-neutral-900">Delivery</p>
              <p className="text-sm text-neutral-500">2-5 working days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 px-4 py-5 text-center">
              <Banknote className="size-6 text-emerald-700" aria-hidden="true" />
              <p className="font-semibold text-neutral-900">Payment</p>
              <p className="text-sm text-neutral-500">Cash on Delivery</p>
            </CardContent>
          </Card>
        </div>

        {/* actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-11 w-full px-6 font-semibold sm:w-auto">
            <a href={`#/track?order=${encodeURIComponent(orderNumber)}`}>Track Your Order</a>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full px-6 font-medium sm:w-auto">
            <a href="#/shop">Continue Shopping</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full px-4 sm:w-auto"
            aria-label="Message us on WhatsApp about your order"
          >
            <a href={waHref} target="_blank" rel="noreferrer">
              <MessageCircle className="size-5 text-emerald-600" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
