import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Sans_Georgian, Noto_Sans_Hebrew } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";
import { site } from "@/constants/site";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, locales, localeMeta, localePath } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/provider";

/** Editorial display face for headlines. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

/** Interface face for everything else. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

/**
 * Fraunces and Inter cover Latin and Cyrillic but have no Georgian or Hebrew
 * glyphs — without these the ka and he pages would render in a fallback face
 * chosen by the OS, which is exactly the "translated but not designed" look we
 * are trying to avoid. Both are wired into the font stack in globals.css.
 */
const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian"],
  display: "swap",
});

const notoHebrew = Noto_Sans_Hebrew({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  props: LayoutProps<"/[locale]">,
): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  const title = `${site.name} — ${t.meta.tagline}`;

  return {
    metadataBase: new URL(site.url),
    title: {
      default: title,
      template: `%s — ${site.name}`,
    },
    description: t.meta.description,
    /**
     * Tells search engines these four URLs are the same page in different
     * languages, so the right one is served rather than treating them as
     * duplicates. `x-default` points at English.
     */
    alternates: {
      canonical: localePath(locale, "/"),
      languages: {
        ...Object.fromEntries(
          locales.map((code) => [localeMeta[code].htmlLang, localePath(code, "/")]),
        ),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description: t.meta.description,
      locale: localeMeta[locale].intlLocale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.meta.description,
    },
  };
}

export default async function RootLayout(props: LayoutProps<"/[locale]">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const { dir, htmlLang } = localeMeta[locale];

  return (
    <html
      lang={htmlLang}
      dir={dir}
      className={`${fraunces.variable} ${inter.variable} ${notoGeorgian.variable} ${notoHebrew.variable} h-full antialiased`}
      data-locale={locale}
    >
      {/*
        The root layout deliberately holds no chrome. Marketing pages get the
        header and footer from `(site)/layout.tsx`; the admin panel is a
        different product surface with its own shell. Both are route groups, so
        neither appears in a URL.
      */}
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale} dictionary={t}>{props.children}</LocaleProvider>
      </body>
    </html>
  );
}
