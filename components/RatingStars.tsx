// components/RatingStars.tsx
// Displays a star rating (e.g. "★ 4.7 (23 reviews)").
// Used on worker cards and profiles.

interface Props {
  rating: number;   // 0–5
  count?: number;   // number of reviews
  size?: "sm" | "md";
}

export function RatingStars({ rating, count, size = "sm" }: Props) {
  const hasRating = rating > 0;
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={`inline-flex items-center gap-1 ${textSize}`}>
      <span className="text-warning" aria-hidden="true">★</span>
      <span className="font-medium text-text-primary">
        {hasRating ? rating.toFixed(1) : "—"}
      </span>
      {count !== undefined && (
        <span className="text-text-secondary">
          ({hasRating ? count : "no reviews yet"})
        </span>
      )}
    </div>
  );
}
