"use client";

import { Copy, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/admin/shared";
import { useAdminSubscribers } from "@/hooks/use-admin";
import { formatDate } from "@/lib/format";

/** Newsletter subscribers: copy emails + client-side CSV export. */
export default function SubscribersList() {
  const subscribers = useAdminSubscribers();
  const items = subscribers.data ?? [];

  async function copyEmails() {
    if (items.length === 0) return;
    const text = items.map((s) => s.email).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${items.length} email${items.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  }

  function exportCsv() {
    if (items.length === 0) return;
    const rows = ["email,subscribed_at", ...items.map((s) => `${s.email},${s.createdAt}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "subscribers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exported subscribers.csv");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {items.length} newsletter subscriber{items.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void copyEmails()} disabled={items.length === 0}>
            <Copy aria-hidden="true" /> Copy Emails
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={exportCsv}
            disabled={items.length === 0}
          >
            <Download aria-hidden="true" /> Export CSV
          </Button>
        </div>
      </div>

      {subscribers.isPending ? (
        <TableSkeleton rows={6} />
      ) : subscribers.isError ? (
        <ErrorState
          error={subscribers.error}
          onRetry={() => void subscribers.refetch()}
          label="subscribers"
        />
      ) : items.length === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            icon={Mail}
            title="No subscribers yet"
            hint="Customers who sign up for the newsletter appear here."
          />
        </Card>
      ) : (
        <Card className="rounded-xl p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="pr-4 text-right">Subscribed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((subscriber, index) => (
                  <TableRow key={subscriber.id} className="text-sm">
                    <TableCell className="pl-4 text-xs text-neutral-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-800">
                      {subscriber.email}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-neutral-500">
                      {formatDate(subscriber.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
