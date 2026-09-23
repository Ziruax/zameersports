"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Copy,
  Link2,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
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
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState, ErrorState, TablePagination, TableSkeleton } from "@/components/admin/shared";
import {
  PRODUCT_BADGES,
  type AdminCategory,
  type AdminProduct,
  type AdminProductFull,
  type AdminProductInput,
  adminErrorMessage,
  uploadAdminImage,
  useAdminCategories,
  useAdminProductDelete,
  useAdminProductDetail,
  useAdminProductDuplicate,
  useAdminProductSave,
  useAdminProducts,
  useDebouncedValue,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

type ProductTarget = { mode: "create" } | { mode: "edit"; row: AdminProduct };

interface SpecRow {
  key: string;
  value: string;
}

interface ProductFormState {
  name: string;
  brand: string;
  categoryId: string;
  price: string;
  comparePrice: string;
  stock: string;
  badge: string;
  description: string;
  tags: string;
  specs: SpecRow[];
  images: string[];
  metaTitle: string;
  metaDescription: string;
  featured: boolean;
  isNew: boolean;
  active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  brand: "",
  categoryId: "",
  price: "",
  comparePrice: "",
  stock: "",
  badge: "",
  description: "",
  tags: "",
  specs: [],
  images: [],
  metaTitle: "",
  metaDescription: "",
  featured: false,
  isNew: false,
  active: true,
};

/** Products section: searchable table + add/edit dialog with uploads. */
export default function ProductsManager() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ProductTarget | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const products = useAdminProducts({ search: debouncedSearch, category, page });
  const categories = useAdminCategories();
  const del = useAdminProductDelete();
  const duplicate = useAdminProductDuplicate();

  function handleDuplicate(product: AdminProduct) {
    duplicate.mutate(product.id, {
      onSuccess: (res) =>
        toast.success(`Duplicated as "${res.product.name}" (hidden draft)`),
      onError: (err) => toast.error(adminErrorMessage(err)),
    });
  }

  function handleDelete(product: AdminProduct) {
    setDeleting(null);
    del.mutate(product.id, {
      onSuccess: () => toast.success("Product deleted"),
      onError: (err) => toast.error(adminErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.productCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setEditing({ mode: "create" })}
        >
          <Plus aria-hidden="true" /> Add Product
        </Button>
      </div>

      {/* Table */}
      {products.isPending ? (
        <TableSkeleton rows={8} />
      ) : products.isError ? (
        <ErrorState
          error={products.error}
          onRetry={() => void products.refetch()}
          label="products"
        />
      ) : (products.data?.items.length ?? 0) === 0 ? (
        <Card className="rounded-xl">
          <EmptyState
            icon={Package}
            title="No products found"
            hint="Try clearing the search or category filter."
          />
        </Card>
      ) : (
        <Card className={cn("rounded-xl p-0", products.isFetching && "opacity-60")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data?.items.map((p) => (
                  <TableRow key={p.id} className={cn("text-sm", !p.active && "opacity-60")}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            className="size-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                          />
                        ) : (
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                            <Package className="size-5 text-neutral-300" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-56 truncate font-medium text-neutral-900">
                            {p.name}
                          </p>
                          {p.brand ? (
                            <p className="text-xs text-neutral-400">{p.brand}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-neutral-600">
                      {p.categoryName}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-neutral-900">{formatPrice(p.price)}</p>
                      {p.comparePrice ? (
                        <p className="text-xs text-neutral-400 line-through">
                          {formatPrice(p.comparePrice)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        p.stock < 5
                          ? "text-red-600"
                          : p.stock < 10
                            ? "text-amber-600"
                            : "text-neutral-700",
                      )}
                    >
                      {p.stock}
                    </TableCell>
                    <TableCell>
                      {p.badge ? (
                        <Badge variant="secondary" className="rounded-full text-[11px]">
                          {p.badge}
                        </Badge>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.featured ? (
                        <Star className="mx-auto size-4 fill-amber-400 text-amber-400" aria-label="Featured" />
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            p.active ? "bg-emerald-500" : "bg-neutral-300",
                          )}
                          aria-hidden="true"
                        />
                        {p.active ? "Active" : "Hidden"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-neutral-900"
                          onClick={() => setEditing({ mode: "edit", row: p })}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-emerald-700"
                          onClick={() => handleDuplicate(p)}
                          disabled={duplicate.isPending}
                          aria-label={`Duplicate ${p.name}`}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-neutral-500 hover:text-red-600"
                          onClick={() => setDeleting(p)}
                          aria-label={`Delete ${p.name}`}
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

      {products.data ? (
        <TablePagination
          page={products.data.page}
          pages={products.data.pages}
          total={products.data.total}
          onPage={setPage}
          unit="products"
        />
      ) : null}

      {editing ? (
        <ProductDialog target={editing} onClose={() => setEditing(null)} />
      ) : null}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This permanently removes "${deleting.name}" and its reviews. Placed orders keep a snapshot of the item. This cannot be undone.`
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

/* ------------------------------- Edit dialog ------------------------------- */

function buildInitial(
  row: AdminProduct,
  detail?: AdminProductFull,
  detailFailed = false,
): ProductFormState {
  return {
    name: detail?.name ?? row.name,
    brand: detail?.brand ?? row.brand ?? "",
    categoryId: row.categoryId,
    price: String(row.price),
    comparePrice: row.comparePrice != null ? String(row.comparePrice) : "",
    stock: String(row.stock),
    badge: row.badge ?? "",
    description: detailFailed ? "" : (detail?.description ?? ""),
    tags: detailFailed ? "" : (detail?.tags ?? []).join(", "),
    specs: detailFailed
      ? []
      : Object.entries(detail?.specs ?? {}).map(([key, value]) => ({ key, value })),
    images: detailFailed ? (row.image ? [row.image] : []) : (detail?.images ?? []),
    metaTitle: detailFailed ? "" : (detail?.metaTitle ?? ""),
    metaDescription: detailFailed ? "" : (detail?.metaDescription ?? ""),
    featured: row.featured,
    isNew: row.isNew,
    active: row.active,
  };
}

function ProductDialog({
  target,
  onClose,
}: {
  target: ProductTarget;
  onClose: () => void;
}) {
  const isEdit = target.mode === "edit";
  const row = isEdit ? target.row : null;
  const detail = useAdminProductDetail(isEdit ? (row?.id ?? null) : null);

  let body: React.ReactNode;
  if (isEdit && row && detail.isPending) {
    body = (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (isEdit && row && detail.isError) {
    body = (
      <ProductForm
        key={`${row.id}-basic`}
        productId={row.id}
        initial={buildInitial(row, undefined, true)}
        detailFailed
        isEdit
        onClose={onClose}
      />
    );
  } else {
    const initial = isEdit && row ? buildInitial(row, detail.data) : EMPTY_FORM;
    body = (
      <ProductForm
        key={isEdit && row ? row.id : "create"}
        productId={isEdit && row ? row.id : undefined}
        initial={initial}
        isEdit={isEdit}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {isEdit && row ? row.name : "Create a new product for the store"}
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- The form -------------------------------- */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function ProductForm({
  productId,
  initial,
  isEdit,
  detailFailed,
  onClose,
}: {
  productId?: string;
  initial: ProductFormState;
  isEdit: boolean;
  detailFailed?: boolean;
  onClose: () => void;
}) {
  const save = useAdminProductSave();
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [price, setPrice] = useState(initial.price);
  const [comparePrice, setComparePrice] = useState(initial.comparePrice);
  const [stock, setStock] = useState(initial.stock);
  const [badge, setBadge] = useState(initial.badge);
  const [description, setDescription] = useState(initial.description);
  const [tags, setTags] = useState(initial.tags);
  const [specs, setSpecs] = useState<SpecRow[]>(initial.specs);
  const [images, setImages] = useState<string[]>(initial.images);
  const [imageUrl, setImageUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [featured, setFeatured] = useState(initial.featured);
  const [isNew, setNew] = useState(initial.isNew);
  const [active, setActive] = useState(initial.active);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = useAdminCategories();

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name is required (min 2 characters).";
    if (!categoryId) next.categoryId = "Select a category.";
    const priceNum = Number(price);
    if (!price.trim() || !Number.isFinite(priceNum) || Math.round(priceNum) <= 0) {
      next.price = "Enter a price greater than 0.";
    }
    const stockNum = Number(stock);
    if (!stock.trim() || !Number.isFinite(stockNum) || Math.round(stockNum) < 0) {
      next.stock = "Enter a valid stock count.";
    }
    if (comparePrice.trim()) {
      const cp = Number(comparePrice);
      if (!Number.isFinite(cp) || Math.round(cp) <= 0) {
        next.comparePrice = "Compare price must be greater than 0.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadAdminImage(file);
        setImages((prev) => (prev.length >= 10 ? prev : [...prev, url]));
      }
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!validate()) return;
    const data: AdminProductInput = {
      name: name.trim(),
      brand: brand.trim(),
      categoryId,
      price: Math.round(Number(price)),
      stock: Math.round(Number(stock)),
      comparePrice: comparePrice.trim() ? Math.round(Number(comparePrice)) : null,
      // "none" is the dropdown's empty choice — the API expects "" for no badge.
      badge: badge === "none" ? "" : badge,
      featured,
      isNew,
      active,
    };
    if (!detailFailed) {
      data.description = description.trim();
      data.tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      data.specs = Object.fromEntries(
        specs
          .filter((s) => s.key.trim() && s.value.trim())
          .map((s) => [s.key.trim(), s.value.trim()]),
      );
      data.images = images;
      data.metaTitle = metaTitle.trim();
      data.metaDescription = metaDescription.trim();
    }
    try {
      await save.mutateAsync({ id: productId, data });
      toast.success(isEdit ? "Product updated" : "Product added");
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {detailFailed ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Full product details could not be loaded (the product may be inactive), so
            description, tags, specs and images are not editable right now and will be
            left unchanged on save.
          </span>
        </div>
      ) : null}

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="product-name">Name *</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Zameer Legend Cricket Bat"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-brand">Brand</Label>
        <Input
          id="product-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g. Zameer Sports"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-category">Category *</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="product-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.categoryId} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-price">Price (Rs) *</Label>
        <Input
          id="product-price"
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 2500"
        />
        <FieldError message={errors.price} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-compare">Compare Price (Rs)</Label>
        <Input
          id="product-compare"
          type="number"
          min={1}
          value={comparePrice}
          onChange={(e) => setComparePrice(e.target.value)}
          placeholder="Optional — shows a discount"
        />
        <FieldError message={errors.comparePrice} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-stock">Stock *</Label>
        <Input
          id="product-stock"
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="e.g. 25"
        />
        <FieldError message={errors.stock} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-badge">Badge</Label>
        <Select value={badge} onValueChange={setBadge}>
          <SelectTrigger id="product-badge">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {PRODUCT_BADGES.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!detailFailed ? (
        <>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full product description shown on the product page"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="product-tags">Tags</Label>
            <Input
              id="product-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma separated, e.g. cricket, bat, kashmir willow"
            />
          </div>

          {/* Specs editor */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Specifications</Label>
            {specs.length === 0 ? (
              <p className="text-xs text-neutral-400">No specifications yet.</p>
            ) : null}
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={spec.key}
                  onChange={(e) =>
                    setSpecs((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, key: e.target.value } : s)),
                    )
                  }
                  placeholder="Label (e.g. Material)"
                  aria-label={`Specification ${index + 1} label`}
                />
                <Input
                  value={spec.value}
                  onChange={(e) =>
                    setSpecs((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, value: e.target.value } : s)),
                    )
                  }
                  placeholder="Value (e.g. Kashmir willow)"
                  aria-label={`Specification ${index + 1} value`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-neutral-400 hover:text-red-600"
                  onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove specification ${index + 1}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
            >
              <Plus aria-hidden="true" /> Add Row
            </Button>
          </div>

          {/* Images */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Images (first is the main image)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                Upload Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleUpload(event)}
                  disabled={uploading}
                />
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="…or paste an image URL"
                className="max-w-72"
                aria-label="Image URL"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const url = imageUrl.trim();
                  if (!url) return;
                  setImages((prev) => (prev.length >= 10 ? prev : [...prev, url]));
                  setImageUrl("");
                }}
              >
                <Link2 aria-hidden="true" /> Add
              </Button>
            </div>
            {images.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1">
                {images.map((img, index) => (
                  <li key={`${img}-${index}`} className="relative">
                    <img
                      src={img}
                      alt={`Product image ${index + 1}`}
                      className="size-20 rounded-lg border border-neutral-200 object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 rounded bg-neutral-900/70 px-1 text-[9px] font-semibold uppercase text-white">
                        Main
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-red-600"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-400">
                No images yet — upload a file or paste a URL.
              </p>
            )}
          </div>
        </>
      ) : null}

      {/* SEO */}
      {!detailFailed ? (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            SEO (optional)
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="product-meta-title">Meta title</Label>
            <Input
              id="product-meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Custom browser tab / search result title (max 150 characters)"
            />
            <p className="text-xs text-neutral-400">
              Leave empty to use the product name automatically.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-meta-desc">Meta description</Label>
            <Textarea
              id="product-meta-desc"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Short description for Google search results (max 320 characters)"
              rows={3}
            />
            <p className="text-xs text-neutral-400">
              Leave empty to use the first part of the product description.
            </p>
          </div>
        </div>
      ) : null}

      {/* Switches */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 sm:col-span-2">
        <div className="flex items-center gap-2">
          <Switch id="product-featured" checked={featured} onCheckedChange={setFeatured} />
          <Label htmlFor="product-featured" className="text-sm font-normal text-neutral-700">
            Featured
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="product-new" checked={isNew} onCheckedChange={setNew} />
          <Label htmlFor="product-new" className="text-sm font-normal text-neutral-700">
            New Arrival
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="product-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="product-active" className="text-sm font-normal text-neutral-700">
            Active
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 sm:col-span-2">
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
          {isEdit ? "Save Changes" : "Add Product"}
        </Button>
      </div>
    </div>
  );
}
