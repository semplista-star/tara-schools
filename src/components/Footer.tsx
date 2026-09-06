import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSelector from "@/components/LanguageSelector";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border bg-panel px-6 py-5 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-inksoft">
            WCAG 2.1 AA
          </span>
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-inksoft">
            RGPD / LOPD-GDD
          </span>
          <Link href="/declaracion-accesibilidad" className="text-xs text-inksoft underline hover:text-accent">
            {t("accessibilityStatement")}
          </Link>
          <Link href="/politica-privacidad" className="text-xs text-inksoft underline hover:text-accent">
            {t("privacyPolicy")}
          </Link>
        </div>
        <LanguageSelector />
      </div>
    </footer>
  );
}
