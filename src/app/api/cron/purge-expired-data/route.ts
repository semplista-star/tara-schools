import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USAGE_RETENTION_DAYS, PUBLIC_ALERT_RETENTION_DAYS } from "@/lib/retention";

// Se ejecuta cada noche (ver vercel.json). Vercel firma la petición con
// CRON_SECRET automáticamente — si no coincide, no es una llamada real del
// cron.
//
// Regla de seguridad no negociable: una alerta de seguridad ABIERTA o EN
// REVISIÓN nunca se borra por antigüedad, por muy vieja que sea. Solo se
// purgan alertas ya RESUELTAS, y solo pasado su plazo de retención.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const usageCutoff = new Date(Date.now() - PUBLIC_USAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const alertCutoff = new Date(Date.now() - PUBLIC_ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deletedSummaries = await prisma.publicUsageSummary.deleteMany({
    where: { createdAt: { lt: usageCutoff } }
  });

  const deletedAlerts = await prisma.publicSafetyAlert.deleteMany({
    where: { status: "RESOLVED", resolvedAt: { lt: alertCutoff } }
  });

  // Un visitante sin ningún resumen ni alerta restante no aporta nada por
  // sí solo (solo guarda codi + idioma) — se limpia también.
  const deletedVisitors = await prisma.publicVisitor.deleteMany({
    where: { usageSummaries: { none: {} }, safetyAlerts: { none: {} } }
  });

  return NextResponse.json({
    ok: true,
    deletedSummaries: deletedSummaries.count,
    deletedAlerts: deletedAlerts.count,
    deletedVisitors: deletedVisitors.count
  });
}
