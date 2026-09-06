"use server";

import { revalidatePath } from "next/cache";
import { ConsentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";

async function loadOwnGroup(groupId: string, schoolId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.schoolId !== schoolId) throw new ForbiddenError("Grupo no encontrado en este centro");
  return group;
}

async function loadOwnStudent(studentId: string, schoolId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== schoolId) throw new ForbiddenError("Alumno/a no encontrado/a en este centro");
  return student;
}

export async function assignTutor(formData: FormData) {
  const user = await requireStaff(["ADMIN"]);
  const groupId = String(formData.get("groupId"));
  const staffId = String(formData.get("staffId"));
  if (!staffId) return;

  const group = await loadOwnGroup(groupId, user.schoolId);
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } });
  if (!staff || staff.schoolId !== user.schoolId || staff.role !== "TUTOR") {
    throw new ForbiddenError("La persona indicada no es tutora de este centro");
  }

  await prisma.group.update({
    where: { id: group.id },
    data: { tutors: { connect: { id: staff.id } } }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "ASSIGN_TUTOR",
    targetType: "Group",
    targetId: group.id,
    metadata: { staffId: staff.id }
  });

  revalidatePath("/admin/grupos");
}

export async function unassignTutor(formData: FormData) {
  const user = await requireStaff(["ADMIN"]);
  const groupId = String(formData.get("groupId"));
  const staffId = String(formData.get("staffId"));

  const group = await loadOwnGroup(groupId, user.schoolId);

  await prisma.group.update({
    where: { id: group.id },
    data: { tutors: { disconnect: { id: staffId } } }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "UNASSIGN_TUTOR",
    targetType: "Group",
    targetId: group.id,
    metadata: { staffId }
  });

  revalidatePath("/admin/grupos");
}

export async function updateConsentStatus(formData: FormData) {
  const user = await requireStaff(["ADMIN"]);
  const studentId = String(formData.get("studentId"));
  const status = String(formData.get("status")) as ConsentStatus;
  if (!Object.values(ConsentStatus).includes(status)) return;

  const student = await loadOwnStudent(studentId, user.schoolId);

  await prisma.student.update({ where: { id: student.id }, data: { consentStatus: status } });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "UPDATE_CONSENT_STATUS",
    targetType: "Student",
    targetId: student.id,
    metadata: { status }
  });

  revalidatePath("/admin/alumnado");
  revalidatePath("/admin");
}
