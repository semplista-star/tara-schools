import { prisma } from "@/lib/prisma";

// Toda visualización de datos agregados, toda alerta consultada y toda
// exportación debe pasar por aquí. No lanza si falla (no debe romper la
// funcionalidad principal), pero el fallo se registra en consola.
export async function logAudit(params: {
  schoolId: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: params.schoolId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as any
      }
    });
  } catch (err) {
    console.error("No se pudo registrar el audit log:", err);
  }
}
