import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SignOutButton from "@/components/SignOutButton";

export default async function ControlLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "controlCenter" });

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("panelLabel")}</p>
          <h1 className="text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <SignOutButton />
      </header>
      <nav className="bg-panel border-b border-border px-6 flex gap-1" aria-label={t("panelLabel")}>
        {[
          { href: "/control", label: t("navSummary") },
          { href: "/control/cuentas", label: t("navAccounts") }
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2.5 text-sm text-inksoft border-b-2 border-transparent hover:text-accent hover:border-accent-light"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-6 max-w-6xl mx-auto w-full flex-1 space-y-8">{children}</main>
    </div>
  );
}
