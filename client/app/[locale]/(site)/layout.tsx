import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getI18n } from "@/lib/i18n/server";

/**
 * Public site chrome.
 *
 * Everything a traveller sees lives under this group. It is a route group, so
 * `(site)` never appears in a URL — `/tours` is still `/tours`. The admin panel
 * sits outside it and supplies its own shell instead of this header and footer.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-200 focus:rounded-sm focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:text-on-dark"
      >
        {t.a11y.skipToContent}
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
