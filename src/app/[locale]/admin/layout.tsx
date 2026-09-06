import { IconFileDownload } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SignOutButton from "@/components/SignOutButton";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminLayout" });

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("panelLabel")}</p>
          <h1 className="text-lg font-semibold text-ink">{t("brand")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/export"
            className="inline-flex items-center gap-1.5 text-sm text-inksoft border border-border rounded-md px-3 py-1.5 hover:border-accent hover:text-accent"
          >
            <IconFileDownload size={16} stroke={2} aria-hidden="true" />
            {t("exportButton")}
          </a>
          <SignOutButton />
        </div>
      </header>
      <nav className="bg-panel border-b border-border px-6 flex gap-1" aria-label={t("panelLabel")}>
        {[
          { href: "/admin", label: t("navSummary") },
          { href: "/admin/grupos", label: t("navGroups") },
          { href: "/admin/alumnado", label: t("navStudents") }
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
      <main className="p-6 max-w-5xl mx-auto w-full flex-1">{children}</main>
    </div>
  );
}
