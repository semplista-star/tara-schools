"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LanguageSelector() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value as Locale;
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="language-selector" className="sr-only">
        {t("languageSelectorLabel")}
      </label>
      <select
        id="language-selector"
        value={locale}
        onChange={handleChange}
        className="border border-border rounded-md px-2 py-1.5 text-sm bg-panel text-inksoft"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
