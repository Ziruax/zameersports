import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  shipped: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-800 text-emerald-50",
  cancelled: "bg-neutral-200 text-neutral-600",
};

/** Colored chip for an order status. */
export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        STATUS_STYLES[status] ?? "bg-neutral-200 text-neutral-600",
        className,
      )}
    >
      {status}
    </span>
  );
}
