import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacyPage" });
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

          <section className="bg-accent-light border border-accent/20 rounded-lg p-4">
            <h2 className="text-ink font-medium mb-1">{t("principleTitle")}</h2>
            <p>{t("principleBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("dataCollectedTitle")}</h2>
            <p>{t("dataCollectedBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("legalBasisTitle")}</h2>
            <p>{t("legalBasisBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("minorsTitle")}</h2>
            <p>{t("minorsBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("retentionTitle")}</h2>
            <p>{t("retentionBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("rightsTitle")}</h2>
            <p>{t("rightsBody")}</p>
          </section>

          <section>
            <h2 className="text-ink font-medium mb-1">{t("contactTitle")}</h2>
            <p>{t("contactBody")}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
