import { IconAlertOctagon, IconUserCheck, IconUsersGroup } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { weekBuckets } from "@/lib/weeks";
import { meetsKAnonymity } from "@/lib/kanonymity";
import StatCard from "@/components/StatCard";
import CircularGauge from "@/components/CircularGauge";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminDashboard" });
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

  const buckets = weekBuckets(8, locale);
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
        <StatCard label={t("statConsent")} value={`${grantedStudents} / ${totalStudents}`} Icon={IconUserCheck} />
        <StatCard label={t("statGroupsData")} value={`${groupsWithData} / ${groups.length}`} Icon={IconUsersGroup} />
        <StatCard
          label={t("statOpenAlerts")}
          value={openAlerts}
          Icon={IconAlertOctagon}
          tone={openAlerts > 0 ? "danger" : "ink"}
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        <WeeklyTrendChart title={t("chartTitle")} labels={buckets.map((b) => b.label)} values={trendValues} />
        <CircularGauge
          label={t("gaugeLabel")}
          pct={consentPct}
          hasData={totalStudents > 0}
          caption={
            totalStudents > 0
              ? t("gaugeCaptionWithData", { granted: grantedStudents, total: totalStudents })
              : t("gaugeCaptionNoData")
          }
        />
      </section>

      <p className="text-muted text-xs">{t("footnote")}</p>
    </div>
  );
}
