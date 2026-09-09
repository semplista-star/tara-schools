import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, totpQrDataUrl } from "@/lib/totp";
import { redirect } from "@/i18n/navigation";
import SignOutButton from "@/components/SignOutButton";
import { confirmTotp } from "@/app/[locale]/2fa-setup/actions";

export default async function TwoFactorSetupPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "twoFactorSetup" });
  const user = await requireStaff(["SUPERADMIN"]);

  let staff = await prisma.staffUser.findUnique({ where: { id: user.id } });
  if (!staff) redirect({ href: "/login", locale });

  if (staff!.totpEnabledAt) {
    redirect({ href: "/control", locale });
  }

  if (!staff!.totpSecret) {
    const secret = generateTotpSecret();
    staff = await prisma.staffUser.update({ where: { id: user.id }, data: { totpSecret: secret } });
  }

  const qr = await totpQrDataUrl(staff!.email, staff!.totpSecret!);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-panel border border-border rounded-lg p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-ink">{t("heading")}</h1>
          <SignOutButton />
        </div>
        <p className="text-inksoft text-sm mb-6">{t("intro")}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={t("qrAlt")} className="mx-auto mb-4 rounded-md border border-border" width={220} height={220} />

        <p className="text-muted text-xs mb-1">{t("manualLabel")}</p>
        <p className="font-mono text-sm text-ink bg-canvas border border-border rounded-md px-3 py-2 mb-6 break-all select-all">
          {staff!.totpSecret}
        </p>

        <form action={confirmTotp} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="code" className="block text-sm text-inksoft">
            {t("codeLabel")}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className="w-full border border-border rounded-md px-3 py-2 bg-canvas focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent tracking-[0.3em] text-center"
          />
          {error === "invalid" && (
            <p role="alert" className="text-danger text-sm">
              {t("invalidCode")}
            </p>
          )}
          <button className="w-full bg-accent-dark text-white rounded-md py-2.5 font-medium hover:opacity-90">
            {t("confirmButton")}
          </button>
        </form>

        <p className="text-muted text-xs mt-6">{t("helpText")}</p>
      </div>
    </div>
  );
}
