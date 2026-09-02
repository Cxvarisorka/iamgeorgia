"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";

import { describeError } from "@/lib/api/client";
import { ratePartnerTransferLeg } from "@/lib/api/ratings";

/** A partner's word on the driver of one completed leg. Once. */
export function RateDriverForm({ reference, legIndex }: { reference: string; legIndex: number }) {
  const router = useRouter();
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
      await ratePartnerTransferLeg(reference, legIndex, { score, comment: comment.trim() || null });
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <p className="text-[0.875rem] text-success">Thank you — your rating has been recorded.</p>;
  }

  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-ink">How was the driver?</p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Score out of 5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            aria-label={`${value} out of 5`}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setScore(value)}
            className="p-1"
          >
            <Star
              size={26}
              className={value <= (hover || score) ? "text-accent-gold" : "text-line"}
              fill={value <= (hover || score) ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
        placeholder="Anything to add? Comments are read by our team before they appear."
        className="mt-3 w-full rounded-sm border border-line bg-background px-3 py-2 text-[0.875rem] text-ink focus:border-ink focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-[0.8125rem] text-error-text">{error}</p>}
      <button
        type="button"
        disabled={busy || score === 0}
        onClick={() => void submit()}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
        Send rating
      </button>
    </div>
  );
}
