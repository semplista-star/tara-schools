"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";

async function loadOwnAlert(alertId: string, schoolId: string) {
  const alert = await prisma.safetyAlert.findUnique({ where: { id: alertId } });
  if (!alert || alert.schoolId !== schoolId) {
    throw new ForbiddenError("Alerta no encontrada en este centro");
  }
  return alert;
}

export async function acknowledgeAlert(formData: FormData) {
  const user = await requireStaff(["WELLBEING_REFERENT"]);
  const alertId = String(formData.get("alertId"));
  const alert = await loadOwnAlert(alertId, user.schoolId);

  await prisma.safetyAlert.update({
    where: { id: alert.id },
    data: { status: "IN_REVIEW", assignedReferentId: user.id }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "ACKNOWLEDGE_SAFETY_ALERT",
    targetType: "SafetyAlert",
    targetId: alert.id
  });

  revalidatePath(`/referente/alertas/${alert.id}`);
  revalidatePath("/referente");
}

export async function resolveAlert(formData: FormData) {
  const user = await requireStaff(["WELLBEING_REFERENT"]);
  const alertId = String(formData.get("alertId"));
  const alert = await loadOwnAlert(alertId, user.schoolId);

  await prisma.safetyAlert.update({
    where: { id: alert.id },
    data: { status: "RESOLVED", resolvedAt: new Date() }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "RESOLVE_SAFETY_ALERT",
    targetType: "SafetyAlert",
    targetId: alert.id
  });

  revalidatePath(`/referente/alertas/${alert.id}`);
  revalidatePath("/referente");
}

export async function addAlertNote(formData: FormData) {
  const user = await requireStaff(["WELLBEING_REFERENT"]);
  const alertId = String(formData.get("alertId"));
  const text = String(formData.get("text") ?? "").trim();
  const alert = await loadOwnAlert(alertId, user.schoolId);

  if (!text) return;

  await prisma.safetyAlertNote.create({
    data: { alertId: alert.id, authorId: user.id, text }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "ADD_SAFETY_ALERT_NOTE",
    targetType: "SafetyAlert",
    targetId: alert.id
  });

  revalidatePath(`/referente/alertas/${alert.id}`);
}

// Solicitud puntual de contexto adicional para un caso. No expone ningún
// texto de conversación: solo deja constancia formal, auditable, de que
// se ha pedido más contexto por el canal humano correspondiente (fuera de
// esta aplicación). Ver principio de privacidad: el texto literal de un
// menor nunca se muestra en este panel.
export async function requestAdditionalContext(formData: FormData) {
  const user = await requireStaff(["WELLBEING_REFERENT"]);
  const alertId = String(formData.get("alertId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const alert = await loadOwnAlert(alertId, user.schoolId);

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "REQUEST_ADDITIONAL_CONTEXT",
    targetType: "SafetyAlert",
    targetId: alert.id,
    metadata: reason ? { reason } : undefined
  });

  revalidatePath(`/referente/alertas/${alert.id}`);
}
