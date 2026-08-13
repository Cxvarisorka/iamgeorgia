import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";
import { Container } from "@/components/ui/Container";
import { site } from "@/constants/site";
import { getI18n } from "@/lib/i18n/server";
import { footerNavigation } from "@/lib/navigation";

export async function Footer() {
  const { t, path, fill } = await getI18n();

  return (
    <footer className="mt-auto bg-ink text-on-dark">
      <Container className="py-20 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="flex items-center gap-3 font-display text-2xl tracking-[0.06em]">
              <Logo className="size-10" />
              {site.wordmark}
            </p>
            <p className="type-body mt-6 max-w-sm text-on-dark/60">{t.meta.description}</p>

            <ul className="mt-10 space-y-3.5">
              <li className="flex items-start gap-3 text-on-dark/70">
                <MapPin size={16} className="mt-1 shrink-0 text-on-dark/40" aria-hidden />
                <span className="type-body-sm">{site.contact.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="mt-1 shrink-0 text-on-dark/40" aria-hidden />
                <a
                  href={`mailto:${site.contact.email}`}
                  className="type-body-sm text-on-dark/70 underline-offset-4 transition-colors hover:text-on-dark hover:underline"
                >
                  {site.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={16} className="mt-1 shrink-0 text-on-dark/40" aria-hidden />
                <a
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  className="type-body-sm text-on-dark/70 underline-offset-4 transition-colors hover:text-on-dark hover:underline"
                >
                  {site.contact.phone}
                </a>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-4">
            {footerNavigation(t).map((group) => (
              <div key={group.title}>
                <h2 className="type-eyebrow text-on-dark/40">{group.title}</h2>
                <ul className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <Link
                        href={path(item.href)}
                        className="type-body-sm text-on-dark/70 transition-colors hover:text-on-dark"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h2 className="type-eyebrow text-on-dark/40">{t.nav.groups.follow}</h2>
              <ul className="mt-5 space-y-3">
                {site.social.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="type-body-sm text-on-dark/70 transition-colors hover:text-on-dark"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter is visual only — nothing is submitted or stored. */}
          <div className="lg:col-span-3">
            <h2 className="type-eyebrow text-on-dark/40">{t.footer.dispatches}</h2>
            <p className="type-body-sm mt-5 text-on-dark/60">{t.footer.newsletterBody}</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-on-dark/12 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-caption text-on-dark/40">
            {fill(t.footer.rights, { year: new Date().getFullYear(), name: site.name })}
          </p>
          <p className="type-caption text-on-dark/40">{site.contact.hours}</p>
        </div>
      </Container>
    </footer>
  );
}
