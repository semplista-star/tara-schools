"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";

export default function SignOutButton() {
  const t = useTranslations("common");
  const locale = useLocale();

  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
      className="text-sm text-inksoft border border-border rounded-md px-3 py-1.5 hover:border-accent hover:text-accent"
    >
      {t("signOut")}
    </button>
  );
}
