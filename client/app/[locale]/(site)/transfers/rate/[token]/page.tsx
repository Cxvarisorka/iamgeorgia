import type { Metadata } from "next";

import { RateFromLinkForm } from "@/components/transfers/RateFromLinkForm";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return { title: t.transfers.rating.title, robots: { index: false, follow: false } };
}

/**
 * The page behind the rating link. The token in the URL is the credential;
 * the server checks it names a completed leg and the address it was sent to.
 */
export default async function RateTransferPage({ params }: PageProps<"/[locale]/transfers/rate/[token]">) {
  const { token } = await params;
  const { t } = await getI18n();

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-[2rem] leading-tight text-ink">{t.transfers.rating.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{t.transfers.rating.intro}</p>
        <div className="mt-8">
          <RateFromLinkForm token={token} />
        </div>
      </div>
    </Container>
  );
}
