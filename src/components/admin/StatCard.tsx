"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "emerald" | "amber" | "red" | "neutral";

const TONE_STYLES: Record<StatTone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

/** KPI card: icon circle + label + value. */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "emerald",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            TONE_STYLES[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="truncate font-display text-xl font-bold text-neutral-900">
            {value}
          </p>
          {hint ? <p className="text-[11px] text-neutral-400">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
