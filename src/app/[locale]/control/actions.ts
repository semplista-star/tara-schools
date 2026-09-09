"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { CENTRAL_SCHOOL_ID } from "@/lib/central";

async function loadAlert(alertId: string) {
  const alert = await prisma.publicSafetyAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new ForbiddenError("Alerta no encontrada");
  return alert;
}

export async function acknowledgePublicAlert(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const alertId = String(formData.get("alertId"));
  const alert = await loadAlert(alertId);

  await prisma.publicSafetyAlert.update({
    where: { id: alert.id },
    data: { status: "IN_REVIEW", assignedReferentId: user.id }
  });

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "ACKNOWLEDGE_PUBLIC_SAFETY_ALERT",
    targetType: "PublicSafetyAlert",
    targetId: alert.id
  });

  revalidatePath("/[locale]/control/alertas/[id]", "page");
  revalidatePath("/[locale]/control", "page");
}

export async function resolvePublicAlert(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const alertId = String(formData.get("alertId"));
  const alert = await loadAlert(alertId);

  await prisma.publicSafetyAlert.update({
    where: { id: alert.id },
    data: { status: "RESOLVED", resolvedAt: new Date() }
  });

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "RESOLVE_PUBLIC_SAFETY_ALERT",
    targetType: "PublicSafetyAlert",
    targetId: alert.id
  });

  revalidatePath("/[locale]/control/alertas/[id]", "page");
  revalidatePath("/[locale]/control", "page");
}

export async function addPublicAlertNote(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const alertId = String(formData.get("alertId"));
  const text = String(formData.get("text") ?? "").trim();
  const alert = await loadAlert(alertId);

  if (!text) return;

  await prisma.publicSafetyAlertNote.create({
    data: { alertId: alert.id, authorId: user.id, text }
  });

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "ADD_PUBLIC_SAFETY_ALERT_NOTE",
    targetType: "PublicSafetyAlert",
    targetId: alert.id
  });

  revalidatePath("/[locale]/control/alertas/[id]", "page");
}
