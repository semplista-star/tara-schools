"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff, ForbiddenError } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { redirect } from "@/i18n/navigation";

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
