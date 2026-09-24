"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Package,
  Settings as SettingsIcon,
  Star,
  TicketPercent,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { usePathRoute } from "@/hooks/use-path-route";
import {
  adminErrorMessage,
  useAdminLogout,
  useAdminMe,
  useAdminMessages,
  useAdminStats,
  type AdminIdentity,
} from "@/hooks/use-admin";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorState } from "./shared";
import AdminLogin from "./views/AdminLogin";
import CategoriesManager from "./views/CategoriesManager";
import CouponsManager from "./views/CouponsManager";
import DashboardHome from "./views/DashboardHome";
import MessagesInbox from "./views/MessagesInbox";
import OrdersManager from "./views/OrdersManager";
import ProductsManager from "./views/ProductsManager";
import ReviewsManager from "./views/ReviewsManager";
import SettingsForm from "./views/SettingsForm";
import SubscribersList from "./views/SubscribersList";

type Section =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "coupons"
  | "reviews"
  | "messages"
  | "subscribers"
  | "settings";

const SECTION_TITLES: Record<Section, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  categories: "Categories",
  coupons: "Coupons",
  reviews: "Reviews",
  messages: "Messages",
  subscribers: "Subscribers",
  settings: "Settings",
};

/**
 * Admin dashboard SPA view (/admin). Renders as a fixed full-screen overlay
 * on top of the storefront with its own sidebar + topbar layout.
 */
export default function AdminApp() {
  const me = useAdminMe();
  const [section, setSection] = useState<Section>("dashboard");

  const isAuthError =
    me.isError && me.error instanceof ApiError && me.error.status === 401;

  if (me.isPending) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-100"
        role="status"
        aria-label="Loading admin dashboard"
      >
        <Loader2 className="size-8 animate-spin text-emerald-600" aria-hidden="true" />
      </div>
    );
  }

  if (me.isError && !isAuthError) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-neutral-100 p-6">
        <div className="mx-auto mt-16 max-w-md">
          <ErrorState
            error={me.error}
            onRetry={() => void me.refetch()}
            label="admin session"
          />
        </div>
      </div>
    );
  }

  if (isAuthError || !me.data?.admin) {
    return <AdminLogin onSuccess={() => void me.refetch()} />;
  }

  return (
    <AdminShell
      admin={me.data.admin}
      section={section}
      onSection={setSection}
      onSessionEnd={() => void me.refetch()}
    />
  );
}

/* ---------------------------------- Shell ---------------------------------- */

function AdminShell({
  admin,
  section,
  onSection,
  onSessionEnd,
}: {
  admin: AdminIdentity;
  section: Section;
  onSection: (section: Section) => void;
  onSessionEnd: () => void;
}) {
  const { navigate } = usePathRoute();
  const logout = useAdminLogout();
  const stats = useAdminStats();
  const messages = useAdminMessages();

  const pendingCount = stats.data?.pendingCount ?? 0;
  const unreadCount = (messages.data ?? []).filter((m) => !m.read).length;

  const navItems: { key: Section; label: string; icon: LucideIcon; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "orders", label: "Orders", icon: Package, badge: pendingCount },
    { key: "products", label: "Products", icon: Boxes },
    { key: "categories", label: "Categories", icon: FolderTree },
    { key: "coupons", label: "Coupons", icon: TicketPercent },
    { key: "reviews", label: "Reviews", icon: Star },
    { key: "messages", label: "Messages", icon: Mail, badge: unreadCount },
    { key: "subscribers", label: "Subscribers", icon: Users },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      toast.success("Signed out");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      onSessionEnd();
    }
  }

  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[60] flex bg-neutral-100">
      {/* Sidebar */}
      <aside className="flex w-16 shrink-0 flex-col bg-neutral-900 lg:w-60">
        <div className="flex h-16 shrink-0 items-center justify-center gap-2.5 border-b border-neutral-800 lg:justify-start lg:px-4">
          <Image
            src="/images/brand/logo.png"
            alt="Zameer Sports"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span className="hidden font-display text-sm font-bold uppercase tracking-widest text-white lg:block">
            Zameer Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto py-3" aria-label="Admin sections">
          {navItems.map((item) => {
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSection(item.key)}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative flex h-11 w-full items-center justify-center gap-3 text-sm font-medium transition-colors lg:justify-start lg:px-4",
                  active
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-800/60 hover:text-white",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500"
                    aria-hidden="true"
                  />
                ) : null}
                <item.icon
                  className={cn("size-5 shrink-0", active && "text-emerald-400")}
                  aria-hidden="true"
                />
                <span className="hidden lg:block">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={cn(
                      "absolute right-2 top-1/2 flex min-w-5 -translate-y-1/2 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold lg:static lg:translate-y-0 lg:ml-auto lg:mr-0 lg:right-auto",
                      item.key === "orders"
                        ? "bg-amber-500 text-neutral-900"
                        : "bg-emerald-500 text-neutral-900",
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            title="View Store"
            className="flex h-11 w-full items-center justify-center gap-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white lg:justify-start lg:px-4"
          >
            <ExternalLink className="size-5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:block">View Store</span>
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logout.isPending}
            title="Logout"
            className="flex h-11 w-full items-center justify-center gap-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-red-600/80 hover:text-white disabled:opacity-50 lg:justify-start lg:px-4"
          >
            {logout.isPending ? (
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-5 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden lg:block">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold uppercase tracking-wide text-neutral-900">
              {SECTION_TITLES[section]}
            </h1>
            <p className="hidden text-xs text-neutral-500 sm:block">{today}</p>
          </div>
          <div
            className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5"
            title={admin.name}
          >
            <span
              className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {admin.email.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-44 truncate text-xs font-medium text-neutral-600">
              {admin.email}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {section === "dashboard" ? (
              <DashboardHome onGoOrders={() => onSection("orders")} />
            ) : null}
            {section === "orders" ? <OrdersManager /> : null}
            {section === "products" ? <ProductsManager /> : null}
            {section === "categories" ? <CategoriesManager /> : null}
            {section === "coupons" ? <CouponsManager /> : null}
            {section === "reviews" ? <ReviewsManager /> : null}
            {section === "messages" ? <MessagesInbox /> : null}
            {section === "subscribers" ? <SubscribersList /> : null}
            {section === "settings" ? <SettingsForm /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
