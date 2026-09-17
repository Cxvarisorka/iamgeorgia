"use client";

import { Check, Heart, Link2, Share2, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Modal } from "./Modal";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Browser-only facts that never change during a page's life. */
const subscribeNever = () => () => {};
const readOrigin = () => window.location.origin;
const readNothing = () => "";
const readCanShare = () => typeof navigator.share === "function";
const readFalse = () => false;

interface ShareSaveProps {
  /** What is being shared — the property, journey or package name. */
  title: string;
  /**
   * The canonical, locale-prefixed path of the thing being shared —
   * `/hotels/vera-house`, `/ka/tours/svaneti-trek`. Never the current
   * location: a visitor on a dated, filtered or tracked URL shares the entity,
   * not their session, and the recipient must land on the same page a crawler
   * indexes.
   */
  url: string;
  /** One line under the title in the native share sheet, when there is one. */
  text?: string;
  className?: string;
}

/**
 * One share control for every entity page.
 *
 * Share opens a small sheet with two ways out: the device's own share sheet
 * (Web Share API — WhatsApp, Messenger, Telegram, Mail, whatever is installed)
 * where the browser offers one, and a copy-link row everywhere. The native
 * option is shown only once the client knows it exists, because `navigator`
 * is not there during the server render and a button that appears and then
 * vanishes is worse than one that arrives a frame late.
 *
 * Save is a local toggle; nothing is persisted, there is no account layer.
 */
export function ShareSave({ title, url, text, className }: ShareSaveProps) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Resolved on the client: the absolute address is the origin the visitor is
  // actually on plus the canonical path, with no query string. Read through
  // `useSyncExternalStore` so the server render (no `window`) and the first
  // client render agree, and the real value arrives without a second render
  // scheduled from an effect.
  const origin = useSyncExternalStore(subscribeNever, readOrigin, readNothing);
  const canShare = useSyncExternalStore(subscribeNever, readCanShare, readFalse);
  const href = origin ? new URL(url, origin).toString() : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions — the URL stays visible to copy by hand.
      setCopied(false);
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title, ...(text ? { text } : {}), url: href });
      setShareOpen(false);
    } catch (error) {
      // Dismissing the sheet rejects with AbortError; that is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Anything else: leave the sheet open with the copy row as the way out.
    }
  };

  const rowClass =
    "flex w-full items-center gap-4 rounded-sm border border-line px-4 py-3.5 text-start transition-colors hover:border-ink";

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

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t.share.title} size="sm">
        <div className="px-6 pt-4 pb-6">
          <p className="type-body-sm text-muted">{title}</p>

          <div className="mt-5 flex flex-col gap-2.5">
            {canShare && (
              <button type="button" onClick={shareNative} className={rowClass}>
                <Smartphone size={17} className="shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="type-body-sm block text-ink">{t.share.native}</span>
                  <span className="type-caption block text-muted">{t.share.nativeHint}</span>
                </span>
              </button>
            )}

            <button type="button" onClick={copyLink} className={rowClass}>
              {copied ? (
                <Check size={17} className="shrink-0 text-brand-text" aria-hidden />
              ) : (
                <Link2 size={17} className="shrink-0 text-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="type-body-sm block text-ink">{t.share.copyLink}</span>
                <span className="type-caption block truncate text-muted" dir="ltr">
                  {href}
                </span>
              </span>
            </button>
          </div>

          <p aria-live="polite" className="type-caption mt-3 h-4 text-brand-text">
            {copied ? t.share.copied : ""}
          </p>
        </div>
      </Modal>
    </>
  );
}
