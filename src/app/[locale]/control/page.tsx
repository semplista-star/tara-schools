import { IconAlertOctagon, IconBuildingSkyscraper, IconMessageCircle, IconUsersGroup } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CENTRAL_SCHOOL_ID } from "@/lib/central";
import { weekBuckets } from "@/lib/weeks";
import StatCard from "@/components/StatCard";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import ControlPublicAlertCard from "@/components/ControlPublicAlertCard";
import ControlSchoolAlertRow from "@/components/ControlSchoolAlertRow";

export default async function ControlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "controlCenter" });
  const user = await requireStaff(["SUPERADMIN"]);

  const [schools, totalStudents, openSchoolAlertsCount, totalVisitors, openPublicAlertsCount] = await Promise.all([
    prisma.school.findMany({ where: { id: { not: CENTRAL_SCHOOL_ID } }, orderBy: { name: "asc" } }),
    prisma.student.count(),
    prisma.safetyAlert.count({ where: { status: { not: "RESOLVED" }, schoolId: { not: CENTRAL_SCHOOL_ID } } }),
    prisma.publicVisitor.count(),
    prisma.publicSafetyAlert.count({ where: { status: { not: "RESOLVED" } } })
  ]);

  const schoolRows = await Promise.all(
    schools.map(async (school) => {
      const [students, openAlerts] = await Promise.all([
        prisma.student.count({ where: { schoolId: school.id } }),
        prisma.safetyAlert.count({ where: { schoolId: school.id, status: { not: "RESOLVED" } } })
      ]);
      return { school, students, openAlerts };
    })
  );

  const [openSchoolAlerts, openPublicAlerts] = await Promise.all([
    prisma.safetyAlert.findMany({
      where: { status: { in: ["OPEN", "IN_REVIEW"] }, schoolId: { not: CENTRAL_SCHOOL_ID } },
      include: { student: { include: { group: true } }, school: true },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 20
    }),
    prisma.publicSafetyAlert.findMany({
      where: { status: { in: ["OPEN", "IN_REVIEW"] } },
      include: { visitor: true },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 20
    })
  ]);

  const buckets = weekBuckets(8, locale);
  const [schoolAlertDates, publicAlertDates] = await Promise.all([
    prisma.safetyAlert.findMany({
      where: { createdAt: { gte: buckets[0].start }, schoolId: { not: CENTRAL_SCHOOL_ID } },
      select: { createdAt: true }
    }),
    prisma.publicSafetyAlert.findMany({
      where: { createdAt: { gte: buckets[0].start } },
      select: { createdAt: true }
    })
  ]);
  const allAlertDates = [...schoolAlertDates, ...publicAlertDates].map((a) => a.createdAt);
  const trendValues = buckets.map((b) => allAlertDates.filter((d) => d >= b.start && d < b.end).length);

  await logAudit({
    schoolId: CENTRAL_SCHOOL_ID,
    actorId: user.id,
    action: "VIEW_CONTROL_CENTER"
  });

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("statSchools")} value={schools.length} Icon={IconBuildingSkyscraper} />
        <StatCard label={t("statStudents")} value={totalStudents} Icon={IconUsersGroup} />
        <StatCard
          label={t("statOpenSchoolAlerts")}
          value={openSchoolAlertsCount}
          Icon={IconAlertOctagon}
          tone={openSchoolAlertsCount > 0 ? "danger" : "ink"}
        />
        <StatCard
          label={t("statOpenPublicAlerts")}
          value={openPublicAlertsCount}
          Icon={IconAlertOctagon}
          tone={openPublicAlertsCount > 0 ? "danger" : "ink"}
        />
      </section>

      <section>
        <WeeklyTrendChart title={t("chartTitle")} labels={buckets.map((b) => b.label)} values={trendValues} />
      </section>

      <section>
        <h2 className="text-ink font-medium mb-3">{t("schoolsHeading")}</h2>
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {schoolRows.length === 0 ? (
            <p className="text-muted text-sm p-4">{t("noSchools")}</p>
          ) : (
            schoolRows.map(({ school, students, openAlerts }) => (
              <div key={school.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                <p className="text-ink text-sm font-medium">{school.name}</p>
                <p className="text-muted text-sm">
                  {t("schoolStudentsCount", { count: students })}
                  {openAlerts > 0 && (
                    <span className="text-danger-text font-medium"> · {t("schoolOpenAlertsCount", { count: openAlerts })}</span>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-ink font-medium mb-3">{t("publicWebHeading")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <StatCard label={t("statPublicVisitors")} value={totalVisitors} Icon={IconMessageCircle} />
          <StatCard
            label={t("statOpenPublicAlerts")}
            value={openPublicAlertsCount}
            Icon={IconAlertOctagon}
            tone={openPublicAlertsCount > 0 ? "danger" : "ink"}
          />
        </div>
        {openPublicAlerts.length === 0 ? (
          <p className="text-muted text-sm">{t("noPublicAlerts")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {openPublicAlerts.map((alert) => (
              <ControlPublicAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-ink font-medium mb-1">{t("schoolAlertsHeading")}</h2>
        <p className="text-muted text-xs mb-3">{t("schoolAlertsNote")}</p>
        <div className="bg-panel border border-border rounded-lg p-4">
          {openSchoolAlerts.length === 0 ? (
            <p className="text-muted text-sm">{t("noSchoolAlerts")}</p>
          ) : (
            openSchoolAlerts.map((alert) => <ControlSchoolAlertRow key={alert.id} alert={alert} />)
          )}
        </div>
      </section>
    </>
  );
}
