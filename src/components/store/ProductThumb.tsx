"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Square product thumbnail with a graceful placeholder when the product has
 * no photo yet (admins can create products before uploading images).
 */
export default function ProductThumb({
  src,
  alt,
  sizes = "96px",
  className,
  iconClassName = "size-6",
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-neutral-100", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-neutral-300"
          aria-hidden="true"
        >
          <Package className={iconClassName} />
        </div>
      )}
    </div>
  );
}
