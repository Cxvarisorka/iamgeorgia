import { Container } from "@/components/ui/Container";
import { site } from "@/constants/site";
import { getI18n } from "@/lib/i18n/server";
import type { UiDictionary } from "@/lib/i18n/ui/en";

type LegalKey = "privacy" | "terms" | "cookies";

/**
 * One legal page: a title, the date, an intro, and a run of short sections.
 *
 * The prose is entirely dictionary text; the registered company name,
 * address and email are filled in from `constants/site` so they are stated
 * once, identically, in every language. The "pending legal review" note is
 * shared across the three documents and rendered in italics, as the brief
 * asks — a template must not read as if a lawyer had signed it.
 */
export async function LegalDocument({ document }: { document: LegalKey }) {
  const { t, fill } = await getI18n();
  const doc: UiDictionary["legal"][LegalKey] = t.legal[document];

  const values = {
    name: site.seo.legalName,
    address: site.contact.address,
    email: site.contact.email,
  };

  return (
    <article className="py-20 lg:py-28">
      <Container>
        <div className="mx-auto max-w-3xl">
          <header className="border-b border-line pb-10">
            <h1 className="type-h1 text-balance">{doc.title}</h1>
            <p className="type-caption mt-5 text-subtle">{doc.updated}</p>
            <p className="type-body-lg mt-8 text-body">{fill(doc.intro, values)}</p>
            <p className="type-body-sm mt-6 italic text-muted">{t.legal.templateNote}</p>
          </header>

          <div className="mt-12 space-y-12">
            {doc.sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="type-h3 flex items-baseline gap-4">
                  <span className="type-caption text-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 ps-9">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="type-body text-body">
                      {fill(paragraph, values)}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </article>
  );
}
