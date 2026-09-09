import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  // El acceso al centro de control requiere 2FA configurada — quien no la
  // tenga se queda aquí hasta que la active, sin excepción.
  const user = await requireStaff(["SUPERADMIN"]);
  const staff = await prisma.staffUser.findUnique({ where: { id: user.id }, select: { totpEnabledAt: true } });
  if (!staff?.totpEnabledAt) redirect({ href: "/2fa-setup", locale });

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
