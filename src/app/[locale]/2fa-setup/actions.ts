"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";
import { redirect } from "@/i18n/navigation";

export async function confirmTotp(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const code = String(formData.get("code") ?? "").trim();
  const locale = String(formData.get("locale") ?? "es");

  const staff = await prisma.staffUser.findUnique({ where: { id: user.id } });
  if (!staff?.totpSecret) throw new ForbiddenError("No hay ningún código pendiente de confirmar");

  if (!code || !(await verifyTotp(code, staff.totpSecret))) {
    redirect({ href: "/2fa-setup?error=invalid", locale });
    return;
  }

  await prisma.staffUser.update({ where: { id: user.id }, data: { totpEnabledAt: new Date() } });
  redirect({ href: "/control", locale });
}
