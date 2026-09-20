import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

/** 5-star rating display (amber stars, half-star via fill-opacity). */
export default function RatingStars({ rating, count, size = "sm" }: RatingStarsProps) {
  const starClass = size === "sm" ? "size-3.5" : "size-4";
  const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : "0";

  return (
    <div className="flex items-center gap-1.5" aria-label={`Rated ${ratingLabel} out of 5`}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const fraction = Math.max(0, Math.min(1, rating - (i - 1)));
          if (fraction >= 0.99) {
            return <Star key={i} className={cn(starClass, "fill-amber-400 text-amber-400")} />;
          }
          if (fraction > 0.01) {
            return (
              <Star
                key={i}
                className={cn(starClass, "text-amber-400")}
                style={{ fill: "#fbbf24", fillOpacity: fraction }}
              />
            );
          }
          return <Star key={i} className={cn(starClass, "fill-neutral-200 text-neutral-300")} />;
        })}
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-neutral-500">({count})</span>
      )}
    </div>
  );
}
