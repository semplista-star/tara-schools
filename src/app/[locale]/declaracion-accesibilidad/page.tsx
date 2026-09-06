import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AccessibilityStatementPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accessibilityPage" });
  const updated = new Date("2026-09-06").toLocaleDateString(locale, { dateStyle: "long" });

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <main className="p-6 max-w-2xl mx-auto w-full flex-1">
        <Link href="/" className="text-sm text-inksoft hover:text-accent">
          Tara Centros
        </Link>
        <h1 className="text-2xl font-semibold text-ink mt-4 mb-1">{t("title")}</h1>
        <p className="text-muted text-sm mb-8">{t("updated", { date: updated })}</p>

        <div className="space-y-6 text-inksoft">
          <p>{t("intro")}</p>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("conformanceTitle")}</h2>
            <p>{t("conformanceBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("limitationsTitle")}</h2>
            <p>{t("limitationsBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("preparationTitle")}</h2>
            <p>{t("preparationBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("contactTitle")}</h2>
            <p>{t("contactBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("feedbackTitle")}</h2>
            <p>{t("feedbackBody")}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
