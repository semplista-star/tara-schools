"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { CENTRAL_SCHOOL_ID } from "@/lib/central";

const CREATABLE_ROLES: StaffRole[] = ["ADMIN", "TUTOR", "WELLBEING_REFERENT"];

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

export async function createSchool(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const school = await prisma.school.create({ data: { name } });

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "CREATE_SCHOOL",
    targetType: "School",
    targetId: school.id
  });

  revalidatePath("/[locale]/control/cuentas", "page");
}

// Crea cuentas de personal de centro (ADMIN/TUTOR/WELLBEING_REFERENT) desde
// el centro de control. Nunca crea cuentas SUPERADMIN — esas se gestionan
// aparte, fuera de este formulario, para no poder auto-otorgarse acceso
// global desde una acción de formulario.
export async function createStaffAccount(formData: FormData) {
  const user = await requireStaff(["SUPERADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as StaffRole;
  const schoolId = String(formData.get("schoolId") ?? "");

  if (!name || !email || !password || password.length < 8 || !schoolId) return;
  if (!CREATABLE_ROLES.includes(role)) return;

  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await prisma.staffUser.create({
    data: { name, email, passwordHash, role, schoolId }
  });

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "CREATE_STAFF_ACCOUNT",
    targetType: "StaffUser",
    targetId: staff.id,
    metadata: { role, schoolId }
  });

  revalidatePath("/[locale]/control/cuentas", "page");
}
