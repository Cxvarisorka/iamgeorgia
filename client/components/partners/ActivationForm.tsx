"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { describeError } from "@/lib/api/client";
import { setPasswordFromActivation } from "@/lib/api/partners";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 12;

/**
 * Setting a password from an activation link.
 *
 * Succeeding here signs the user straight in — they have just proved control of
 * the mailbox the link was sent to, and bouncing them to a login form to retype
 * the password they chose a second ago achieves nothing.
 */
export function ActivationForm({ token }: { token: string }) {
  const router = useRouter();
  const path = useLocalePath();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }

    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const session = await setPasswordFromActivation(token, password);
      router.replace(path(session.partner ? "/portal" : "/admin"));
      router.refresh();
    } catch (caught) {
      setError(describeError(caught));
      setSubmitting(false);
    }
  };

  const field =
    "h-11 w-full rounded-sm border bg-background px-3 text-[0.875rem] text-ink transition-colors focus:outline-none";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "activation-error" : "password-hint"}
          className={cn(field, error ? "border-error" : "border-line focus:border-ink")}
        />
        <p id="password-hint" className="mt-1.5 text-[0.75rem] text-muted">
          At least {MIN_PASSWORD} characters. A short phrase you will remember beats a short word
          with symbols in it.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(field, error ? "border-error" : "border-line focus:border-ink")}
        />
      </div>

      {error && (
        <p id="activation-error" role="alert" className="text-[0.8125rem] text-error-text">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-brand text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Activate my account
      </button>
    </form>
  );
}
