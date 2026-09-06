import { IconAlertOctagon, IconUserCheck, IconUsersGroup } from "@tabler/icons-react";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { weekBuckets } from "@/lib/weeks";
import { meetsKAnonymity } from "@/lib/kanonymity";
import StatCard from "@/components/StatCard";
import CircularGauge from "@/components/CircularGauge";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";

export default async function AdminPage() {
  const user = await requireStaff(["ADMIN"]);

  const [totalStudents, grantedStudents, groups, openAlerts] = await Promise.all([
    prisma.student.count({ where: { schoolId: user.schoolId } }),
    prisma.student.count({ where: { schoolId: user.schoolId, consentStatus: "GRANTED" } }),
    prisma.group.findMany({
      where: { schoolId: user.schoolId },
      include: { students: { select: { consentStatus: true } } }
    }),
    prisma.safetyAlert.count({ where: { schoolId: user.schoolId, status: { not: "RESOLVED" } } })
  ]);

  const groupsWithData = groups.filter((g) =>
    meetsKAnonymity(g.students.filter((s) => s.consentStatus === "GRANTED").length)
  ).length;

  const buckets = weekBuckets(8);
  const summaries = await prisma.usageSummary.findMany({
    where: { student: { schoolId: user.schoolId }, periodStart: { gte: buckets[0].start } },
    select: { periodStart: true, sessionsCount: true }
  });
  const trendValues = buckets.map((b) =>
    summaries
      .filter((s) => s.periodStart >= b.start && s.periodStart < b.end)
      .reduce((sum, s) => sum + s.sessionsCount, 0)
  );

  const consentPct = totalStudents > 0 ? Math.round((grantedStudents / totalStudents) * 100) : 0;

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "VIEW_SCHOOL_AGGREGATE",
    targetType: "School",
    targetId: user.schoolId
  });

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Alumnado con consentimiento"
          value={`${grantedStudents} / ${totalStudents}`}
          Icon={IconUserCheck}
        />
        <StatCard label="Grupos con datos disponibles" value={`${groupsWithData} / ${groups.length}`} Icon={IconUsersGroup} />
        <StatCard label="Alertas de seguridad abiertas" value={openAlerts} Icon={IconAlertOctagon} tone={openAlerts > 0 ? "danger" : "ink"} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        <WeeklyTrendChart
          title="Sesiones con Tara por semana (todo el centro)"
          labels={buckets.map((b) => b.label)}
          values={trendValues}
        />
        <CircularGauge
          label="Consentimiento familiar"
          pct={consentPct}
          hasData={totalStudents > 0}
          caption={totalStudents > 0 ? `${grantedStudents} de ${totalStudents} concedido` : "Todavía no hay alumnado registrado"}
        />
      </section>

      <p className="text-muted text-xs">
        Un grupo solo muestra datos agregados cuando tiene al menos 5 alumnos activos con consentimiento familiar
        concedido, para proteger su anonimato. Las alertas de seguridad solo muestran aquí un recuento: el detalle
        de cada caso es visible únicamente para la referente de bienestar.
      </p>
    </div>
  );
}
