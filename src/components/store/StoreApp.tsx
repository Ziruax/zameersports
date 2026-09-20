"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useHashRoute } from "@/hooks/use-hash-route";
import { useCartStore } from "@/lib/cart-store";
import type { StoreInitialData } from "@/lib/types";
import AdminApp from "@/components/admin/AdminApp";
import AnnouncementBar from "./AnnouncementBar";
import CartDrawer from "./CartDrawer";
import Footer from "./Footer";
import Header from "./Header";
import WhatsAppFloat from "./WhatsAppFloat";
import AboutView from "./views/AboutView";
import CartView from "./views/CartView";
import CheckoutView from "./views/CheckoutView";
import ContactView from "./views/ContactView";
import HomeView from "./views/HomeView";
import ProductView from "./views/ProductView";
import ShopView from "./views/ShopView";
import SuccessView from "./views/SuccessView";
import TrackView from "./views/TrackView";

export default function StoreApp({ initialData }: { initialData: StoreInitialData }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000 },
        },
      }),
  );

  const { route } = useHashRoute();

  // Rehydrate persisted cart (zustand persist uses skipHydration).
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  // Scroll to top whenever the route changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name, route.params.slug, route.params.orderNumber]);

  const settings = initialData.settings;

  let view: React.ReactNode;
  switch (route.name) {
    case "shop":
      view = <ShopView />;
      break;
    case "product":
      view = <ProductView slug={route.params.slug ?? ""} />;
      break;
    case "cart":
      view = <CartView />;
      break;
    case "checkout":
      view = <CheckoutView />;
      break;
    case "success":
      view = <SuccessView orderNumber={route.params.orderNumber ?? ""} />;
      break;
    case "track":
      view = <TrackView />;
      break;
    case "about":
      view = <AboutView />;
      break;
    case "contact":
      view = <ContactView />;
      break;
    case "admin":
      view = <AdminApp />;
      break;
    case "home":
    default:
      view = <HomeView initialData={initialData} />;
      break;
  }

  const routeKey = `${route.name}:${route.params.slug ?? ""}:${route.params.orderNumber ?? ""}`;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar settings={settings} />
        <Header />
        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {view}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer categories={initialData.categories} settings={settings} />
      </div>
      <CartDrawer settings={settings} />
      <WhatsAppFloat settings={settings} />
    </QueryClientProvider>
  );
}
