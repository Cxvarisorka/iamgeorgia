"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";

import { ApiError, describeError } from "@/lib/api/client";
import { rateFromLink } from "@/lib/api/ratings";
import { useI18n } from "@/lib/i18n/provider";

/** The passenger's rating, from the emailed link. Once. */
export function RateFromLinkForm({ token }: { token: string }) {
  const { t } = useI18n();
  const copy = t.transfers.rating;
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (score === 0) return;
    setBusy(true);
    setError(null);

    try {
      await rateFromLink({ token, score, comment: comment.trim() || null });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 410) setError(copy.expired);
      else if (caught instanceof ApiError && caught.status === 409) setError(copy.already);
      else setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <p className="rounded-sm border border-success/40 bg-success/5 p-4 text-[0.9375rem] text-success">{copy.thanks}</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={copy.scoreLabel}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            aria-label={`${value} / 5`}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setScore(value)}
            className="p-1.5"
          >
            <Star size={34} className={value <= (hover || score) ? "text-accent-gold" : "text-line"} fill={value <= (hover || score) ? "currentColor" : "none"} aria-hidden />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        placeholder={copy.commentPlaceholder}
        className="mt-4 w-full rounded-sm border border-line bg-background px-3 py-2 text-[0.9375rem] text-ink focus:border-ink focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-[0.875rem] text-error-text">{error}</p>}
      <button
        type="button"
        disabled={busy || score === 0}
        onClick={() => void submit()}
        className="mt-4 inline-flex h-12 items-center gap-2 rounded-sm bg-brand px-6 text-[0.9375rem] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {copy.submit}
      </button>
    </div>
  );
}
