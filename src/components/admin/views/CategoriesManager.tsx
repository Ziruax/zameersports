"use client";

import { useState } from "react";
import {
  FolderTree,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/admin/shared";
import {
  type AdminCategory,
  type AdminCategoryInput,
  adminErrorMessage,
  uploadAdminImage,
  useAdminCategories,
  useAdminCategoryDelete,
  useAdminCategorySave,
} from "@/hooks/use-admin";

type CategoryTarget = { mode: "create" } | { mode: "edit"; row: AdminCategory };

/** Categories section: table + add/edit dialog with image upload. */
export default function CategoriesManager() {
  const categories = useAdminCategories();
  const [editing, setEditing] = useState<CategoryTarget | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const del = useAdminCategoryDelete();

  function handleDelete(category: AdminCategory) {
    setDeleting(null);
    del.mutate(category.id, {
      onSuccess: () => toast.success("Category deleted"),
      onError: (err) => toast.error(adminErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Categories organize the shop sidebar and product filters.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setEditing({ mode: "create" })}
        >
          <Plus aria-hidden="true" /> Add Category
        </Button>
      </div>

      {categories.isPending ? (
        <TableSkeleton rows={8} />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          onRetry={() => void categories.refetch()}
          label="categories"
        />
      ) : (categories.data?.length ?? 0) === 0 ? (
        <Card className="rounded-xl">
          <EmptyState icon={FolderTree} title="No categories yet" />
        </Card>
      ) : (
        <Card className="rounded-xl p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.data?.map((c) => (
                  <TableRow key={c.id} className="text-sm">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            loading="lazy"
                            className="size-10 shrink-0 rounded-lg border border-neutral-200 object-cover"
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                            <ImageIcon className="size-4 text-neutral-300" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900">{c.name}</p>
                          {c.description ? (
                            <p className="max-w-72 truncate text-xs text-neutral-400">
                              {c.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-neutral-600">{c.slug}</TableCell>
                    <TableCell className="text-center text-neutral-700">{c.productCount}</TableCell>
                    <TableCell className="text-center">
                      {c.featured ? (
                        <Star className="mx-auto size-4 fill-amber-400 text-amber-400" aria-label="Featured" />
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-neutral-600">{c.sortOrder}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-neutral-900"
                          onClick={() => setEditing({ mode: "edit", row: c })}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-red-600"
                          onClick={() => setDeleting(c)}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {editing ? (
        <CategoryDialog key={editing.mode === "edit" ? editing.row.id : "create"} target={editing} onClose={() => setEditing(null)} />
      ) : null}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This permanently removes "${deleting.name}". Categories that still contain products cannot be deleted.`
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

/* ------------------------------ Category dialog ----------------------------- */

function CategoryDialog({
  target,
  onClose,
}: {
  target: CategoryTarget;
  onClose: () => void;
}) {
  const isEdit = target.mode === "edit";
  const row = isEdit ? target.row : null;
  const save = useAdminCategorySave();

  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [image, setImage] = useState(row?.image ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(String(row?.sortOrder ?? 0));
  const [featured, setFeatured] = useState(row?.featured ?? false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAdminImage(file);
      setImage(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      setError("Name is required (min 2 characters).");
      return;
    }
    const sortNum = Number(sortOrder);
    const data: AdminCategoryInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      image: image.trim(),
      icon: icon.trim(),
      featured,
      sortOrder: Number.isFinite(sortNum) ? Math.max(0, Math.min(999, Math.round(sortNum))) : 0,
    };
    try {
      await save.mutateAsync({ id: row?.id, data });
      toast.success(isEdit ? "Category updated" : "Category added");
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {isEdit && row ? row.name : "Create a new product category"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name *</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cricket"
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Leave blank to auto-generate from name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short text shown on the category page"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-image">Image</Label>
            <div className="flex items-center gap-2">
              {image ? (
                <img
                  src={image}
                  alt="Category preview"
                  className="size-10 shrink-0 rounded-lg border border-neutral-200 object-cover"
                />
              ) : null}
              <Input
                id="category-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/categories/…"
              />
              <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => void handleUpload(event)}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-icon">Icon</Label>
              <Input
                id="category-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Lucide icon name, e.g. Zap"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-sort">Sort Order</Label>
              <Input
                id="category-sort"
                type="number"
                min={0}
                max={999}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <Switch id="category-featured" checked={featured} onCheckedChange={setFeatured} />
            <Label htmlFor="category-featured" className="text-sm font-normal text-neutral-700">
              Featured in shop navigation
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={save.isPending}
              onClick={() => void handleSave()}
            >
              {save.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              {isEdit ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
