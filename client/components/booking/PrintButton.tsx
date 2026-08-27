"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/Button";

/**
 * A voucher a guest can put in a wallet.
 *
 * Deliberately the browser's own print dialog rather than a generated PDF: the
 * page already reads as a record, and a PDF pipeline would be a second thing to
 * keep in step with the booking snapshot for no gain the traveller can see.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" fullWidth onClick={() => window.print()}>
      <Printer size={16} aria-hidden />
      {label}
    </Button>
  );
}
