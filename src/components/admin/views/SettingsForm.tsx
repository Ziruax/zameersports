"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Phone,
  Save,
  Share2,
  Store,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/admin/shared";
import {
  adminErrorMessage,
  useAdminSettings,
  useAdminSettingsSave,
} from "@/hooks/use-admin";

interface SettingsField {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea";
  hint?: string;
  wide?: boolean;
}

interface SettingsGroup {
  title: string;
  icon: LucideIcon;
  fields: SettingsField[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: "Store",
    icon: Store,
    fields: [
      { key: "store_name", label: "Store name" },
      { key: "store_tagline", label: "Tagline" },
      {
        key: "announcement",
        label: "Announcement",
        type: "textarea",
        hint: "Shown in the green bar at the top of the store",
        wide: true,
      },
    ],
  },
  {
    title: "Contact",
    icon: Phone,
    fields: [
      { key: "phone", label: "Phone" },
      { key: "whatsapp", label: "WhatsApp", hint: "Digits only, e.g. 923465002049" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "hours", label: "Opening hours" },
      { key: "address", label: "Address", type: "textarea", wide: true },
    ],
  },
  {
    title: "Shipping",
    icon: Truck,
    fields: [
      {
        key: "free_shipping_threshold",
        label: "Free shipping threshold (Rs)",
        type: "number",
      },
      { key: "shipping_fee", label: "Shipping fee (Rs)", type: "number" },
    ],
  },
  {
    title: "Social",
    icon: Share2,
    fields: [
      { key: "facebook1", label: "Facebook" },
      { key: "facebook2", label: "Facebook (page 2)" },
      { key: "tiktok", label: "TikTok" },
      { key: "instagram", label: "Instagram" },
      { key: "youtube", label: "YouTube" },
    ],
  },
];

/** Store settings editor grouped into cards; PATCHes {updates:{...}}. */
export default function SettingsForm() {
  const settings = useAdminSettings();

  if (settings.isPending) {
    return (
      <div className="space-y-4">
        {SETTINGS_GROUPS.map((group) => (
          <Card key={group.title} className="rounded-xl">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => void settings.refetch()}
        label="settings"
      />
    );
  }

  return (
    <SettingsFormInner key={String(settings.dataUpdatedAt)} initial={settings.data} />
  );
}

function SettingsFormInner({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const save = useAdminSettingsSave();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const group of SETTINGS_GROUPS) {
      for (const field of group.fields) {
        seed[field.key] = initial[field.key] ?? "";
      }
    }
    return seed;
  });

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const updates: Record<string, string> = {};
    for (const group of SETTINGS_GROUPS) {
      for (const field of group.fields) {
        updates[field.key] = values[field.key] ?? "";
      }
    }
    const announcementChanged =
      (updates.announcement ?? "") !== (initial.announcement ?? "");
    try {
      await save.mutateAsync(updates);
      toast.success("Settings saved");
      // The storefront announcement bar is server-rendered from initial data,
      // so refresh the RSC tree to propagate announcement changes live.
      if (announcementChanged) router.refresh();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-500">
          Changes apply to the storefront immediately after saving.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={save.isPending}
          onClick={() => void handleSave()}
        >
          {save.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Save Changes
        </Button>
      </div>

      {SETTINGS_GROUPS.map((group) => (
        <Card key={group.title} className="rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <span
                className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                aria-hidden="true"
              >
                <group.icon className="size-4" />
              </span>
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div
                key={field.key}
                className={`space-y-1.5 ${field.wide ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={`setting-${field.key}`}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`setting-${field.key}`}
                    rows={2}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={`setting-${field.key}`}
                    type={field.type === "number" ? "number" : "text"}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                )}
                {field.hint ? (
                  <p className="text-xs text-neutral-400">{field.hint}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={save.isPending}
          onClick={() => void handleSave()}
        >
          {save.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
