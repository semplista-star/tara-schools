"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { redirect } from "@/i18n/navigation";

const MAX_CSV_ROWS = 500;

async function loadOwnGroup(groupId: string, schoolId: string, tutorId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, schoolId, tutors: { some: { id: tutorId } } }
  });
  if (!group) throw new ForbiddenError("Grupo no encontrado o no asignado a este tutor");
  return group;
}

// Añade un alumno/a al grupo, uno a uno. Solo el alias pseudónimo y,
// opcionalmente, el correo de contacto familiar — nunca datos identificativos
// del menor, igual que en el resto del esquema.
export async function addStudent(formData: FormData) {
  const user = await requireStaff(["TUTOR"]);
  const groupId = String(formData.get("groupId"));
  const alias = String(formData.get("alias") ?? "").trim();
  const guardianEmail = String(formData.get("guardianEmail") ?? "").trim();

  if (!alias) return;
  const group = await loadOwnGroup(groupId, user.schoolId, user.id);

  await prisma.student.upsert({
    where: { groupId_alias: { groupId: group.id, alias } },
    update: {},
    create: {
      alias,
      schoolId: user.schoolId,
      groupId: group.id,
      guardianEmail: guardianEmail || null
    }
  });

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "ADD_STUDENT",
    targetType: "Group",
    targetId: group.id
  });

  revalidatePath("/[locale]/tutor", "page");
}

// Parser CSV minimalista: una fila por alumno/a, columnas "alias,correo_familiar"
// (el correo es opcional). Detecta y descarta una posible fila de cabecera.
function parseStudentsCsv(text: string): { alias: string; guardianEmail: string | null }[] {
  const rows: { alias: string; guardianEmail: string | null }[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [rawAlias, rawEmail] = trimmed.split(",");
    const alias = (rawAlias ?? "").trim();
    if (!alias) continue;
    if (rows.length === 0 && /^(alias|alumno|nombre|name)$/i.test(alias)) continue; // cabecera
    rows.push({ alias, guardianEmail: (rawEmail ?? "").trim() || null });
    if (rows.length >= MAX_CSV_ROWS) break;
  }
  return rows;
}

// Importación masiva por CSV, al mismo grupo. Los alias duplicados dentro
// del grupo (ya existentes o repetidos en el propio archivo) se saltan en
// vez de fallar toda la importación, para poder re-subir el mismo archivo
// sin miedo a duplicar alumnado.
export async function importStudentsCsv(formData: FormData) {
  const user = await requireStaff(["TUTOR"]);
  const groupId = String(formData.get("groupId"));
  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    redirect({ href: `/tutor?grupo=${groupId}&csv=empty`, locale: String(formData.get("locale") ?? "es") });
    return;
  }

  const group = await loadOwnGroup(groupId, user.schoolId, user.id);
  const text = await file.text();
  const rows = parseStudentsCsv(text);

  let created = 0;
  if (rows.length > 0) {
    const uniqueByAlias = new Map(rows.map((r) => [r.alias, r]));
    const result = await prisma.student.createMany({
      data: Array.from(uniqueByAlias.values()).map((r) => ({
        alias: r.alias,
        schoolId: user.schoolId,
        groupId: group.id,
        guardianEmail: r.guardianEmail
      })),
      skipDuplicates: true
    });
    created = result.count;
  }

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "IMPORT_STUDENTS_CSV",
    targetType: "Group",
    targetId: group.id,
    metadata: { rowsParsed: rows.length, created }
  });

  redirect({
    href: `/tutor?grupo=${group.id}&csv=ok&csvCreated=${created}&csvParsed=${rows.length}`,
    locale: String(formData.get("locale") ?? "es")
  });
}

// Envía un recordatorio real por correo a las familias con consentimiento
// pendiente de un grupo. Si el centro no tiene el correo configurado (o un
// alumno/a no tiene correo de contacto registrado), lo decimos tal cual en
// vez de simular un envío que no ha ocurrido.
export async function sendConsentReminder(formData: FormData) {
  const user = await requireStaff(["TUTOR"]);
  const groupId = String(formData.get("groupId"));
  const locale = String(formData.get("locale") ?? "es");

  const group = await prisma.group.findFirst({
    where: { id: groupId, schoolId: user.schoolId, tutors: { some: { id: user.id } } }
  });
  if (!group) throw new ForbiddenError("Grupo no encontrado o no asignado a este tutor");

  const pendingStudents = await prisma.student.findMany({
    where: { groupId: group.id, consentStatus: "PENDING" }
  });
  const withEmail = pendingStudents.filter((s): s is typeof s & { guardianEmail: string } =>
    Boolean(s.guardianEmail)
  );
  const withoutEmail = pendingStudents.length - withEmail.length;

  let status: "unconfigured" | "sent" | "error" = "sent";
  let sentCount = 0;

  if (!isMailConfigured()) {
    status = "unconfigured";
  } else {
    for (const student of withEmail) {
      try {
        await sendMail({
          to: student.guardianEmail,
          subject: "Recordatorio: autorización familiar para Tara",
          text: `Hola,\n\nTodavía no hemos recibido la autorización familiar para que ${student.alias} pueda usar Tara en el centro. Por favor, contacta con la administración del centro para completarla.\n\nGracias.`
        });
        sentCount++;
      } catch (err) {
        console.error("Error enviando recordatorio de consentimiento:", err);
      }
    }
    if (sentCount === 0 && withEmail.length > 0) status = "error";
  }

  if (status === "sent") {
    await logAudit({
      schoolId: user.schoolId,
      actorId: user.id,
      action: "SEND_CONSENT_REMINDER",
      targetType: "Group",
      targetId: group.id,
      metadata: { sentCount, withoutEmail }
    });
  }

  redirect({
    href: `/tutor?grupo=${group.id}&recordatorio=${status}&enviados=${sentCount}&sinCorreo=${withoutEmail}`,
    locale
  });
}
