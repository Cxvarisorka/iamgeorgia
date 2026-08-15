"use client";

import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";

import { adminUser } from "@/data/admin/user";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Prototype sign-in.
 *
 * There is no authentication here and none is implied: any input gets you in,
 * and the notice below says so plainly rather than letting a reviewer assume
 * the panel is protected. The fields are pre-filled with the fixture operator
 * so the flow can be walked in two clicks.
 *
 * Real credential handling would belong on a server, not in this component.
 */
export function SignInForm() {
  const router = useRouter();
  const path = useLocalePath();
  const [email, setEmail] = useState(adminUser.email);
  const [password, setPassword] = useState("prototype");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter an email address and a password to continue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    // A beat, so the transition reads as a sign-in rather than a link click.
    setTimeout(() => router.push(path("/admin")), 450);
  };

  const field =
    "h-11 w-full rounded-sm border bg-on-dark/6 px-3.5 text-sm text-on-dark placeholder:text-on-dark/35 transition-colors focus:outline-none";
  const label = "mb-1.5 block text-[0.75rem] font-medium text-on-dark/60";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8">
      <div className="space-y-4">
        <div>
          <label htmlFor="admin-email" className={label}>
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "admin-signin-error" : undefined}
            className={cn(
              field,
              error ? "border-error-on-dark" : "border-on-dark/15 focus:border-on-dark/45",
            )}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className={label}>
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "admin-signin-error" : undefined}
            className={cn(
              field,
              error ? "border-error-on-dark" : "border-on-dark/15 focus:border-on-dark/45",
            )}
          />
        </div>
      </div>

      {error && (
        <p
          id="admin-signin-error"
          role="alert"
          className="mt-3 text-[0.8125rem] text-error-on-dark"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-brand text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-70"
      >
        {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-6 flex items-start gap-2.5 rounded-sm bg-on-dark/6 p-3.5 text-[0.75rem] leading-relaxed text-on-dark/60">
        <Info size={14} className="mt-px shrink-0 text-on-dark/40" aria-hidden />
        <span>
          This screen is part of a front-end prototype. It performs no
          authentication — any credentials will open the panel, and nothing is
          transmitted or stored.
        </span>
      </p>
    </form>
  );
}
