"use client";

import { Check, Heart, Link2, Share2 } from "lucide-react";
import { useState } from "react";

import { Modal } from "./Modal";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface ShareSaveProps {
  title: string;
  className?: string;
}

/**
 * Save is a local toggle; share opens a dialog with a copy-link affordance.
 * Nothing is persisted — there is no account layer in this prototype.
 */
export function ShareSave({ title, className }: ShareSaveProps) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions — the URL stays visible to copy by hand.
      setCopied(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-sm px-3 text-[0.8125rem] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink"
        >
          <Share2 size={15} aria-hidden />
          {t.actions.share}
        </button>

        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          aria-pressed={saved}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-sm px-3 text-[0.8125rem] font-medium transition-colors",
            saved ? "text-brand-text hover:bg-surface-soft" : "text-body hover:bg-surface-soft hover:text-ink",
          )}
        >
          <Heart
            size={15}
            className={cn("transition-transform duration-200", saved && "scale-110 fill-brand")}
            aria-hidden
          />
          {saved ? t.actions.saved : t.actions.save}
        </button>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share" size="sm">
        <div className="px-6 pt-4 pb-6">
          <p className="type-body-sm text-muted">{title}</p>

          <button
            type="button"
            onClick={copyLink}
            className="mt-5 flex w-full items-center justify-between gap-4 rounded-sm border border-line px-4 py-3.5 text-left transition-colors hover:border-ink"
          >
            <span className="min-w-0 flex-1">
              <span className="type-caption block text-muted">{t.share.pageLink}</span>
              <span className="type-body-sm block truncate text-ink">
                {typeof window !== "undefined" ? window.location.href : ""}
              </span>
            </span>
            {copied ? (
              <Check size={17} className="shrink-0 text-brand-text" aria-hidden />
            ) : (
              <Link2 size={17} className="shrink-0 text-muted" aria-hidden />
            )}
          </button>

          <p aria-live="polite" className="type-caption mt-3 h-4 text-brand-text">
            {copied ? t.share.copied : ""}
          </p>
        </div>
      </Modal>
    </>
  );
}
