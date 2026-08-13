import { ScoreBadge } from "@/components/ui/Rating";
import type { Review, ReviewCategoryScore } from "@/types";

interface HotelReviewsProps {
  guestScore: number;
  reviewCount: number;
  categoryScores: ReviewCategoryScore[];
  reviews: Review[];
}

/** All review content is fictional mock data — nothing is fetched or submitted. */
export function HotelReviews({
  guestScore,
  reviewCount,
  categoryScores,
  reviews,
}: HotelReviewsProps) {
  return (
    <div>
      <div className="grid gap-8 border border-line bg-surface p-6 lg:grid-cols-12 lg:gap-10 lg:p-8">
        <div className="lg:col-span-4">
          <ScoreBadge score={guestScore} reviewCount={reviewCount} size="lg" />
          <p className="type-body-sm mt-5 text-muted">
            Based on {reviewCount.toLocaleString()} verified stays over the last twelve months.
          </p>
        </div>

        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:col-span-8">
          {categoryScores.map((category) => (
            <div key={category.label}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="type-body-sm text-body">{category.label}</dt>
                <dd className="type-body-sm font-medium tabular-nums">
                  {category.score.toFixed(1)}
                </dd>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(category.score / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </div>

      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {reviews.map((review) => (
          <li key={review.id} className="border border-line bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-h4">{review.author}</p>
                <p className="type-caption mt-1 text-muted">
                  {review.country} · {review.tripType}
                </p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm rounded-bl-none bg-brand-600 text-sm font-semibold text-white tabular-nums">
                {review.score.toFixed(1)}
              </span>
            </div>

            <blockquote className="mt-5">
              <p className="type-h4 font-display font-normal">&ldquo;{review.title}&rdquo;</p>
              <p className="type-body-sm mt-3 text-body">{review.body}</p>
            </blockquote>

            <p className="type-caption mt-5 text-subtle">Stayed {review.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
