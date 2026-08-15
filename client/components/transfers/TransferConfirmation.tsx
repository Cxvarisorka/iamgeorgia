"use client";

import { useSearchParams } from "next/navigation";
import { Check, Copy, Mail, Phone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { TransferBookingSummary } from "./TransferBookingSummary";
import { TransferSteps } from "./TransferSteps";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { site } from "@/constants/site";
import { getTransferOfferBySlug } from "@/data/transfers";
import { fill } from "@/lib/i18n/dictionaries";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import {
  getBookingDraftServerSnapshot,
  getBookingDraftSnapshot,
  subscribeToBookingDraft,
} from "@/lib/transfers/booking";
import {
  getRouteMetrics,
  parseTransferQuery,
  quoteFor,
  serializeTransferQuery,
} from "@/lib/transfers/query";

/**
 * Confirmation.
 *
 * The journey and reference come from the URL so the page survives a reload;
 * the passenger's own details come from the session draft, which never entered
 * the URL. If the draft is gone — reopened link, new tab — the screen still
 * renders everything about the journey, and simply says less about the person.
 */
export function TransferConfirmation() {
  const searchParams = useSearchParams();
  const path = useLocalePath();
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);

  // sessionStorage is an external store, and this is the hook for reading one:
  // it renders as `null` on the server and on the first client pass, then
  // settles on the real draft without a hydration mismatch.
  const draft = useSyncExternalStore(
    subscribeToBookingDraft,
    getBookingDraftSnapshot,
    getBookingDraftServerSnapshot,
  );

  const query = parseTransferQuery(searchParams);
  const offer = getTransferOfferBySlug(searchParams.get("offer") ?? "", locale);
  const route = getRouteMetrics(query);
  const quote = offer && route ? quoteFor(offer, route) : null;
  const reference = searchParams.get("ref") ?? draft?.reference ?? null;

  if (!offer || !quote || !reference) {
    return (
      <Container className="py-24">
        <EmptyState
          title={t.transfers.confirmation.nothingTitle}
          description={t.transfers.confirmation.nothingBody}
          action={{
            label: t.transfers.booking.searchTransfers,
            href: path("/transfers"),
          }}
        />
      </Container>
    );
  }

  const detailHref = `${path(`/transfers/${offer.slug}`)}?${serializeTransferQuery(query)}`;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the reference is on screen regardless.
    }
  };

  return (
    <Container className="pt-8 pb-24 lg:pb-32">
      <TransferSteps current={4} />

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        <div className="min-w-0 lg:col-span-7">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface-soft text-success">
            <Check size={26} aria-hidden />
          </span>

          <h1 className="type-h1 mt-6 text-balance">{t.transfers.confirmation.title}</h1>
          <p className="type-body-lg mt-4 text-body">
            {draft?.firstName
              ? fill(t.transfers.confirmation.thanks, { name: draft.firstName })
              : ""}
            {fill(t.transfers.confirmation.body, { provider: offer.provider.name })}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-line py-5">
            <div>
              <p className="type-caption text-muted">{t.transfers.confirmation.reference}</p>
              <p className="type-h3 mt-1 tabular-nums">{reference}</p>
            </div>
            <button
              type="button"
              onClick={copyReference}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/25 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied ? t.transfers.confirmation.copied : t.transfers.confirmation.copy}
            </button>
            <span aria-live="polite" className="sr-only">
              {copied ? t.transfers.confirmation.copiedAnnounce : ""}
            </span>
          </div>

          {draft && (
            <section className="mt-10">
              <h2 className="type-h3">{t.transfers.confirmation.leadPassenger}</h2>
              <dl className="mt-5 divide-y divide-line border-y border-line">
                <div className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className="type-body-sm text-muted">{t.transfers.confirmation.name}</dt>
                  <dd className="type-body-sm text-end font-medium text-ink">
                    {draft.firstName} {draft.lastName}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className="type-body-sm text-muted">{t.transfers.confirmation.email}</dt>
                  <dd className="type-body-sm text-end font-medium break-all text-ink">
                    {draft.email}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className="type-body-sm text-muted">
                    {t.transfers.confirmation.mobile}
                  </dt>
                  <dd className="type-body-sm text-end font-medium text-ink">{draft.phone}</dd>
                </div>
                {draft.flightNumber && (
                  <div className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="type-body-sm text-muted">
                      {t.transfers.confirmation.flight}
                    </dt>
                    <dd className="type-body-sm text-end font-medium text-ink">
                      {draft.flightNumber}
                    </dd>
                  </div>
                )}
                {draft.pickupNote && (
                  <div className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="type-body-sm text-muted">
                      {t.transfers.confirmation.pickupNote}
                    </dt>
                    <dd className="type-body-sm text-end text-body">{draft.pickupNote}</dd>
                  </div>
                )}
                {draft.specialRequests && (
                  <div className="py-3.5">
                    <dt className="type-body-sm text-muted">
                      {t.transfers.confirmation.specialRequests}
                    </dt>
                    <dd className="type-body-sm mt-1.5 text-body">{draft.specialRequests}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section className="mt-10">
            <h2 className="type-h3">{t.transfers.confirmation.whatNext}</h2>
            <ol className="mt-5 space-y-4">
              {t.transfers.confirmation.nextSteps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[0.8125rem] font-semibold text-brand-text tabular-nums">
                    {index + 1}
                  </span>
                  <span className="type-body-sm text-body">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10 rounded-sm bg-surface-soft p-5">
            <h2 className="type-h4">{t.transfers.confirmation.ifChanges}</h2>
            <p className="type-body-sm mt-2 text-body">
              {t.transfers.confirmation.ifChangesBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <a
                href={`mailto:${site.contact.email}`}
                className="type-body-sm inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline"
              >
                <Mail size={15} className="text-brand-text" aria-hidden />
                {site.contact.email}
              </a>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                className="type-body-sm inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline"
              >
                <Phone size={15} className="text-brand-text" aria-hidden />
                {site.contact.phone}
              </a>
            </div>
          </section>

          <p className="type-caption mt-8 border-t border-line pt-5 text-subtle">
            {t.transfers.confirmation.prototypeNote}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={detailHref}>{t.transfers.confirmation.viewDetails}</Button>
            <Button href={path("/")} variant="outline">
              {t.transfers.confirmation.backHome}
            </Button>
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-36">
            <h2 className="type-h4 mb-4">{t.transfers.summary.yourTransfer}</h2>
            <TransferBookingSummary quote={quote} query={query} />
          </div>
        </aside>
      </div>
    </Container>
  );
}
