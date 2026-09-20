"use client";

import { useState } from "react";
import { Loader2, Mail, MailOpen, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState, EmptyState, TableSkeleton } from "@/components/admin/shared";
import {
  type AdminMessage,
  adminErrorMessage,
  useAdminMessageAction,
  useAdminMessages,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

/** Contact-form inbox: list with unread dots, dialog with full message. */
export default function MessagesInbox() {
  const messages = useAdminMessages();
  const action = useAdminMessageAction();
  const [selected, setSelected] = useState<AdminMessage | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const items = messages.data ?? [];
  const unreadCount = items.filter((m) => !m.read).length;

  function openMessage(message: AdminMessage) {
    setSelected(message);
    if (!message.read) {
      action.mutate(
        { id: message.id, action: "read" },
        { onError: (err) => toast.error(adminErrorMessage(err)) },
      );
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await Promise.all(
        items.filter((m) => !m.read).map((m) => action.mutateAsync({ id: m.id, action: "read" })),
      );
      toast.success("All messages marked read");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  async function deleteMessage(message: AdminMessage) {
    setSelected(null);
    try {
      await action.mutateAsync({ id: message.id, action: "delete" });
      toast.success("Message deleted");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
            : "All caught up — no unread messages."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void messages.refetch()}
            disabled={messages.isFetching}
          >
            <RefreshCw
              className={cn(messages.isFetching && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => void markAllRead()}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MailOpen aria-hidden="true" />
            )}
            Mark all read
          </Button>
        </div>
      </div>

      {messages.isPending ? (
        <TableSkeleton rows={6} />
      ) : messages.isError ? (
        <ErrorState
          error={messages.error}
          onRetry={() => void messages.refetch()}
          label="messages"
        />
      ) : items.length === 0 ? (
        <Card className="rounded-xl">
          <EmptyState icon={Mail} title="No messages yet" hint="Contact-form messages land here." />
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 rounded-xl p-0">
          {items.map((message) => (
            <button
              key={message.id}
              type="button"
              onClick={() => openMessage(message)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
              aria-label={`Open message from ${message.name}: ${message.subject}`}
            >
              <span
                className={cn(
                  "mt-2 size-2 shrink-0 rounded-full",
                  message.read ? "bg-neutral-200" : "bg-emerald-500",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      message.read ? "text-neutral-700" : "font-semibold text-neutral-900",
                    )}
                  >
                    {message.name}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatDate(message.createdAt)}
                  </span>
                </span>
                <span className="block truncate text-xs font-medium text-neutral-500">
                  {message.subject || "(no subject)"}
                </span>
                <span className="block truncate text-xs text-neutral-400">
                  {message.message}
                </span>
              </span>
            </button>
          ))}
        </Card>
      )}

      {selected ? (
        <MessageDialog
          key={selected.id}
          message={selected}
          onClose={() => setSelected(null)}
          onToggleRead={async (m) => {
            try {
              await action.mutateAsync({
                id: m.id,
                action: m.read ? "unread" : "read",
              });
              toast.success(m.read ? "Marked as unread" : "Marked as read");
              setSelected(null);
            } catch (err) {
              toast.error(adminErrorMessage(err));
            }
          }}
          onDelete={(m) => void deleteMessage(m)}
          busy={action.isPending}
        />
      ) : null}
    </div>
  );
}

function MessageDialog({
  message,
  onClose,
  onToggleRead,
  onDelete,
  busy,
}: {
  message: AdminMessage;
  onClose: () => void;
  onToggleRead: (message: AdminMessage) => Promise<void>;
  onDelete: (message: AdminMessage) => void;
  busy: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">{message.subject || "(no subject)"}</DialogTitle>
          <DialogDescription className="text-left">
            From {message.name}
            {message.email ? ` (${message.email})` : ""}
            {message.phone ? ` — ${message.phone}` : ""} &middot; {formatDate(message.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <p className="max-h-72 overflow-y-auto whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          {message.message}
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void onToggleRead(message)}
          >
            <MailOpen aria-hidden="true" />
            Mark as {message.read ? "unread" : "read"}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => onDelete(message)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
