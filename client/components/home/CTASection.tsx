import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/constants/site";
import { getI18n } from "@/lib/i18n/server";

export async function CTASection() {
  const { t, path } = await getI18n();

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <Image
        src="/images/home/cta.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-45"
      />
      <div className="scrim-full absolute inset-0" aria-hidden />

      <Container className="relative py-28 lg:py-36">
        <Reveal className="max-w-3xl">
          <p className="type-eyebrow text-on-dark/55">{t.home.cta.eyebrow}</p>
          <h2 className="type-h1 mt-6 text-on-dark text-balance">{t.home.cta.title}</h2>
          <p className="type-body-lg mt-7 max-w-xl text-on-dark/75">{t.home.cta.body}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button href={path("/contact")} size="lg" variant="light">
              {t.actions.planYourTrip}
            </Button>
            <Button href={`mailto:${site.contact.email}`} external size="lg" variant="outlineLight">
              {site.contact.email}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
