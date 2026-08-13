"use client";

import { Check, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

export interface SummaryRow {
  label: string;
  value: string;
}

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  rows: SummaryRow[];
  total?: SummaryRow;
  confirmLabel: string;
}

/**
 * The prototype end-point for every "Reserve" / "Request" action. It reviews a
 * summary, then swaps to a confirmation state. Nothing is submitted, charged or
 * stored, and the dialog says so.
 */
export function RequestModal({
  open,
  onClose,
  title,
  subtitle,
  rows,
  total,
  confirmLabel,
}: RequestModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const close = () => {
    onClose();
    // Reset after the exit animation so the content does not flip mid-close.
    window.setTimeout(() => setConfirmed(false), 300);
  };

  return (
    <Modal open={open} onClose={close} title={confirmed ? "Request received" : title} size="md">
      {confirmed ? (
        <div className="px-6 pt-2 pb-8 text-center sm:px-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-soft text-brand-text">
            <Check size={24} aria-hidden />
          </span>
          <h3 className="type-h3 mt-6">That&apos;s with our team</h3>
          <p className="type-body mt-3 text-muted">
            In a live product this is where you would receive a confirmation email and a
            reference number. Here, it is the end of the prototype flow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={close} variant="outline">
              Close
            </Button>
            <Button href="/contact">Talk to a trip planner</Button>
          </div>
        </div>
      ) : (
        <div className="px-6 pt-2 pb-6 sm:px-8">
          <p className="type-body-sm text-muted">{subtitle}</p>

          <dl className="mt-6 divide-y divide-line border-y border-line">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-6 py-3.5">
                <dt className="type-body-sm text-muted">{row.label}</dt>
                <dd className="type-body-sm text-right font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>

          {total && (
            <div className="flex items-baseline justify-between gap-6 pt-5">
              <span className="type-h4">{total.label}</span>
              <span className="type-h3">{total.value}</span>
            </div>
          )}

          <p className="type-caption mt-6 flex items-start gap-2.5 rounded-sm bg-surface-soft p-4 text-body">
            <Info size={15} className="mt-px shrink-0 text-brand-text" aria-hidden />
            This is a front-end prototype. No booking is made, no payment is taken and nothing
            is stored.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <Button onClick={() => setConfirmed(true)} fullWidth>
              {confirmLabel}
            </Button>
            <Button onClick={close} variant="outline" fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
