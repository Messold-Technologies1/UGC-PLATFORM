import { memo } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: "sm" | "md";
}

export const StarRating = memo(function StarRating({
  rating,
  max = 5,
  size = "sm",
}: StarRatingProps) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const roundedUp = rating % 1 >= 0.75;
  const effectiveFull = full + (roundedUp ? 1 : 0);
  const empty = max - effectiveFull - (hasHalf ? 1 : 0);
  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: effectiveFull }, (_, i) => (
        <Star key={`f-${i}`} className={`${iconSize} fill-amber-400 text-amber-400`} />
      ))}
      {hasHalf && (
        <span className="relative">
          <Star className={`${iconSize} text-amber-400/30`} />
          <span className="absolute inset-0 w-1/2 overflow-hidden">
            <Star className={`${iconSize} fill-amber-400 text-amber-400`} />
          </span>
        </span>
      )}
      {Array.from({ length: Math.max(0, empty) }, (_, i) => (
        <Star key={`e-${i}`} className={`${iconSize} text-muted-foreground/30`} />
      ))}
    </span>
  );
});
