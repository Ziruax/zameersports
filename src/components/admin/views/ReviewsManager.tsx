"use client";

import { useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RatingStars from "@/components/store/RatingStars";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/admin/shared";
import {
  type AdminReview,
  adminErrorMessage,
  useAdminReviewDelete,
  useAdminReviewModerate,
  useAdminReviews,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

type ReviewFilter = "all" | "approved" | "unapproved";

/** Reviews moderation: approve/hide inline, delete, filter by approval state. */
export default function ReviewsManager() {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const reviews = useAdminReviews(
    filter === "all" ? undefined : filter === "approved" ? "approved" : "unapproved",
  );
  const moderate = useAdminReviewModerate();
  const del = useAdminReviewDelete();
  const [deleting, setDeleting] = useState<AdminReview | null>(null);

  function handleDelete(review: AdminReview) {
    setDeleting(null);
    del.mutate(review.id, {
      onSuccess: () => toast.success("Review deleted"),
      onError: (err) => toast.error(adminErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Approving a review recalculates the product rating automatically.
        </p>
        <Select value={filter} onValueChange={(v) => setFilter(v as ReviewFilter)}>
          <SelectTrigger className="w-44" aria-label="Filter reviews">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reviews</SelectItem>
            <SelectItem value="approved">Approved only</SelectItem>
            <SelectItem value="unapproved">Pending approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reviews.isPending ? (
        <TableSkeleton rows={6} />
      ) : reviews.isError ? (
        <ErrorState
          error={reviews.error}
          onRetry={() => void reviews.refetch()}
          label="reviews"
        />
      ) : (reviews.data?.items.length ?? 0) === 0 ? (
        <Card className="rounded-xl">
          <EmptyState icon={Star} title="No reviews found" hint="Reviews appear here as customers submit them." />
        </Card>
      ) : (
        <Card className="rounded-xl p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="max-w-72">Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.data?.items.map((review) => {
                  const rowBusy =
                    (moderate.isPending && moderate.variables?.id === review.id) ||
                    (del.isPending && del.variables === review.id);
                  return (
                    <TableRow
                      key={review.id}
                      className={cn("text-sm", !review.approved && "bg-amber-50/70")}
                    >
                      <TableCell className="pl-4">
                        <p className="max-w-52 truncate font-medium text-neutral-800">
                          {review.productName}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-neutral-600">
                        {review.name}
                      </TableCell>
                      <TableCell>
                        <RatingStars rating={review.rating} />
                      </TableCell>
                      <TableCell className="max-w-72">
                        <p className="line-clamp-2 text-neutral-600">{review.comment}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-neutral-500">
                        {formatDate(review.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={review.approved}
                          disabled={rowBusy}
                          onCheckedChange={(checked) =>
                            moderate.mutate(
                              { id: review.id, approved: checked },
                              {
                                onSuccess: () =>
                                  toast.success(checked ? "Review approved" : "Review hidden"),
                                onError: (err) => toast.error(adminErrorMessage(err)),
                              },
                            )
                          }
                          aria-label={`Toggle approval for ${review.name}'s review`}
                        />
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-neutral-500 hover:text-red-600"
                            onClick={() => setDeleting(review)}
                            aria-label={`Delete ${review.name}'s review`}
                          >
                            {rowBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This permanently removes the review by "${deleting.name}" on "${deleting.productName}".`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && handleDelete(deleting)}
            >
              <Trash2 aria-hidden="true" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
