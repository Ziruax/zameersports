"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminErrorMessage } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

/** Card with an amber warning, the API error message and a Retry button. */
export function ErrorState({
  error,
  onRetry,
  label = "data",
}: {
  error: unknown;
  onRetry: () => void;
  label?: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600"
          aria-hidden="true"
        >
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <p className="font-medium text-neutral-900">Could not load {label}</p>
          <p className="mt-1 text-sm text-neutral-500">{adminErrorMessage(error)}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}

/** Loading placeholder for dense data tables. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Friendly empty state for tables / lists. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span
        className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
        aria-hidden="true"
      >
        <Icon className="size-6" />
      </span>
      <p className="font-medium text-neutral-700">{title}</p>
      {hint ? <p className="text-sm text-neutral-400">{hint}</p> : null}
    </div>
  );
}

/** Prev / numbered / Next pagination footer for admin tables. */
export function TablePagination({
  page,
  pages,
  total,
  onPage,
  unit = "items",
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  unit?: string;
}) {
  const last = Math.max(pages, 1);
  const start = Math.max(1, Math.min(page - 2, last - 4));
  const end = Math.min(last, start + 4);
  const numbers: number[] = [];
  for (let i = start; i <= end; i++) numbers.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
      <p className="text-xs text-neutral-500">
        Page {page} of {last} &middot; {total} {unit}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {numbers.map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            className={cn(
              "min-w-8 px-2",
              n === page && "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
            )}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Build a wa.me deep link from a local or international phone string. */
export function waHref(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0")) return `https://wa.me/92${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}
