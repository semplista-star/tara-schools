import {
  IconAlertOctagon,
  IconArrowRight,
  IconCircleCheck,
  IconUserCheck,
  IconUsersGroup
} from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { weekBuckets } from "@/lib/weeks";
import { meetsKAnonymity, K_ANONYMITY_MIN } from "@/lib/kanonymity";
import { Link } from "@/i18n/navigation";
import SignOutButton from "@/components/SignOutButton";
import ConsentBadge from "@/components/ConsentBadge";
import MoodTrendTag from "@/components/MoodTrendTag";
import StatCard from "@/components/StatCard";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import RadarTopicsChart from "@/components/RadarTopicsChart";
import CircularGauge from "@/components/CircularGauge";
import { sendConsentReminder } from "@/app/[locale]/tutor/actions";

const TOPIC_KEYS = ["conflicto_igual", "estres_academico", "familia", "emociones_generales", "autoestima"] as const;

export default async function TutorPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ grupo?: string; recordatorio?: string; enviados?: string; sinCorreo?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutor" });
  const td = await getTranslations({ locale, namespace: "tutorDashboard" });
  const user = await requireStaff(["TUTOR"]);
  const { grupo, recordatorio, enviados, sinCorreo } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { schoolId: user.schoolId, tutors: { some: { id: user.id } } },
    include: { students: { orderBy: { alias: "asc" } } },
    orderBy: { name: "asc" }
  });

  const activeGroup = groups.find((g) => g.id === grupo) ?? groups[0];

  let latestByStudent = new Map<
    string,
    { periodStart: Date; sessionsCount: number; totalMinutes: number; moodTrend: string | null; topics: unknown }
  >();
  let openBridgeByStudent = new Map<string, number>();

  // Datos de la tabla por alumno/a (sin cambios respecto a la versión anterior).
  if (activeGroup) {
    const studentIds = activeGroup.students.map((s) => s.id);

    const summaries = await prisma.usageSummary.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { periodStart: "desc" }
    });
    for (const summary of summaries) {
      if (!latestByStudent.has(summary.studentId)) {
        latestByStudent.set(summary.studentId, summary);
      }
    }

    const bridgeEvents = await prisma.humanBridgeEvent.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, resolved: false },
      _count: { _all: true }
    });
    for (const row of bridgeEvents) {
      openBridgeByStudent.set(row.studentId, row._count._all);
    }

    await logAudit({
      schoolId: user.schoolId,
      actorId: user.id,
      action: "VIEW_GROUP_SUMMARY",
      targetType: "Group",
      targetId: activeGroup.id
    });
  }

  // --- Resumen editorial del grupo activo ---
  let dashboard: {
    grantedInGroup: number;
    pendingInGroup: number;
    totalInGroup: number;
    consentPct: number;
    openAlertsCount: number;
    bridgesCompletedCount: number;
    groupsWithData: number;
    chartHasData: boolean;
    buckets: { label: string }[];
    groupPerStudent: number[];
    schoolPerStudent: number[];
    topicTotals: Record<string, number>;
    hasTopicData: boolean;
    kOk: boolean;
  } | null = null;

  if (activeGroup) {
    const groupActiveIds = activeGroup.students.filter((s) => s.consentStatus === "GRANTED").map((s) => s.id);
    const kOk = meetsKAnonymity(groupActiveIds.length);

    const grantedInGroup = groupActiveIds.length;
    const pendingInGroup = activeGroup.students.filter((s) => s.consentStatus === "PENDING").length;
    const totalInGroup = activeGroup.students.length;
    const consentPct = totalInGroup > 0 ? Math.round((grantedInGroup / totalInGroup) * 100) : 0;

    const groupsWithData = groups.filter((g) =>
      meetsKAnonymity(g.students.filter((s) => s.consentStatus === "GRANTED").length)
    ).length;

    const [openAlertsCount, bridgesCompletedCount] = await Promise.all([
      prisma.safetyAlert.count({
        where: { schoolId: user.schoolId, status: { not: "RESOLVED" }, student: { groupId: activeGroup.id } }
      }),
      prisma.humanBridgeEvent.count({ where: { resolved: true, student: { groupId: activeGroup.id } } })
    ]);

    const buckets = weekBuckets(8, locale);

    const groupSummaries =
      groupActiveIds.length > 0
        ? await prisma.usageSummary.findMany({
            where: { studentId: { in: groupActiveIds }, periodStart: { gte: buckets[0].start } },
            select: { periodStart: true, sessionsCount: true }
          })
        : [];
    const groupWeekly = buckets.map((b) =>
      groupSummaries.filter((s) => s.periodStart >= b.start && s.periodStart < b.end).reduce((sum, s) => sum + s.sessionsCount, 0)
    );
    const groupPerStudent = groupWeekly.map((v) =>
      groupActiveIds.length > 0 ? Math.round((v / groupActiveIds.length) * 10) / 10 : 0
    );

    const schoolActive = await prisma.student.findMany({
      where: { schoolId: user.schoolId, consentStatus: "GRANTED" },
      select: { id: true }
    });
    const schoolSummaries =
      schoolActive.length > 0
        ? await prisma.usageSummary.findMany({
            where: { studentId: { in: schoolActive.map((s) => s.id) }, periodStart: { gte: buckets[0].start } },
            select: { periodStart: true, sessionsCount: true }
          })
        : [];
    const schoolWeekly = buckets.map((b) =>
      schoolSummaries.filter((s) => s.periodStart >= b.start && s.periodStart < b.end).reduce((sum, s) => sum + s.sessionsCount, 0)
    );
    const schoolPerStudent = schoolWeekly.map((v) =>
      schoolActive.length > 0 ? Math.round((v / schoolActive.length) * 10) / 10 : 0
    );

    const totalGroupSessions = groupWeekly.reduce((a, b) => a + b, 0);
    const chartHasData = kOk && totalGroupSessions > 0;

    const topicTotals: Record<string, number> = Object.fromEntries(TOPIC_KEYS.map((k) => [k, 0]));
    for (const sid of groupActiveIds) {
      const topics = latestByStudent.get(sid)?.topics as Record<string, number> | null | undefined;
      if (topics) {
        for (const key of TOPIC_KEYS) {
          if (typeof topics[key] === "number") topicTotals[key] += topics[key];
        }
      }
    }
    const hasTopicData = kOk && Object.values(topicTotals).some((v) => v > 0);

    dashboard = {
      grantedInGroup,
      pendingInGroup,
      totalInGroup,
      consentPct,
      openAlertsCount,
      bridgesCompletedCount,
      groupsWithData,
      chartHasData,
      buckets,
      groupPerStudent,
      schoolPerStudent,
      topicTotals,
      hasTopicData,
      kOk
    };
  }

  let reminderBanner: string | null = null;
  if (recordatorio && grupo === activeGroup?.id) {
    const sentCount = Number(enviados ?? 0);
    const skippedCount = Number(sinCorreo ?? 0);
    if (recordatorio === "unconfigured") reminderBanner = td("reminderUnconfiguredBanner");
    else if (recordatorio === "error") reminderBanner = td("reminderErrorBanner");
    else if (recordatorio === "sent" && skippedCount > 0)
      reminderBanner = td("reminderSentWithSkippedBanner", { sent: sentCount, skipped: skippedCount });
    else if (recordatorio === "sent") reminderBanner = td("reminderSentBanner", { count: sentCount });
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("panelLabel")}</p>
          <h1 className="text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="p-6 max-w-5xl mx-auto w-full flex-1">
        {groups.length === 0 ? (
          <p className="text-muted text-sm">{t("noGroups")}</p>
        ) : (
          <>
            {groups.length > 1 && (
              <nav className="flex gap-2 mb-6" aria-label={t("groupSelectionLabel")}>
                {groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/tutor?grupo=${g.id}`}
                    aria-current={g.id === activeGroup?.id ? "page" : undefined}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      g.id === activeGroup?.id
                        ? "border-accent text-accent-dark bg-accent-light font-medium"
                        : "border-border text-inksoft hover:border-accent-dark"
                    }`}
                  >
                    {g.name}
                  </Link>
                ))}
              </nav>
            )}

            {activeGroup && dashboard && (
              <>
                <div className="flex items-center gap-2 mb-4 text-inksoft">
                  <IconUsersGroup size={20} stroke={1.75} aria-hidden="true" />
                  <h2 className="font-medium">{activeGroup.name}</h2>
                  <span className="text-muted text-sm">
                    · {t("studentsCount", { count: activeGroup.students.length })}
                  </span>
                </div>

                {/* Cifras clave */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    label={td("statConsent")}
                    value={`${dashboard.grantedInGroup} / ${dashboard.totalInGroup}`}
                    Icon={IconUserCheck}
                  />
                  <StatCard
                    label={td("statGroupsData")}
                    value={`${dashboard.groupsWithData} / ${groups.length}`}
                    Icon={IconUsersGroup}
                  />
                  <StatCard label={td("statOpenAlerts")} value={dashboard.openAlertsCount} Icon={IconAlertOctagon} />
                  <StatCard
                    label={td("statBridgesCompleted")}
                    value={dashboard.bridgesCompletedCount}
                    Icon={IconCircleCheck}
                  />
                </section>

                {/* Sesiones semanales con comparativa del centro */}
                <section className="mb-6">
                  <WeeklyTrendChart
                    title={td("chartTitle")}
                    labels={dashboard.buckets.map((b) => b.label)}
                    values={dashboard.groupPerStudent}
                    primaryLabel={td("chartPrimaryLabel")}
                    comparison={{ label: td("chartComparisonLabel"), values: dashboard.schoolPerStudent }}
                    decimals
                    empty={
                      dashboard.chartHasData
                        ? undefined
                        : {
                            title: td("emptyChartTitle"),
                            body: dashboard.kOk
                              ? td("emptyChartBodyNoData")
                              : td("emptyChartBodyThreshold", { min: K_ANONYMITY_MIN })
                          }
                    }
                  />
                </section>

                <section className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start mb-6">
                  {/* Desglose temático */}
                  <RadarTopicsChart
                    title={td("radarTitle")}
                    labels={TOPIC_KEYS.map((k) => td(`topics.${k}`))}
                    values={TOPIC_KEYS.map((k) => dashboard!.topicTotals[k])}
                    empty={
                      dashboard.hasTopicData
                        ? undefined
                        : {
                            title: td("emptyChartTitle"),
                            body: dashboard.kOk
                              ? td("emptyChartBodyNoData")
                              : td("emptyChartBodyThreshold", { min: K_ANONYMITY_MIN })
                          }
                    }
                  />

                  {/* Consentimiento familiar + acción */}
                  <div>
                    <CircularGauge
                      label={td("gaugeLabel")}
                      pct={dashboard.consentPct}
                      hasData={dashboard.totalInGroup > 0}
                      caption={
                        dashboard.totalInGroup > 0
                          ? td("gaugeCaptionWithData", { granted: dashboard.grantedInGroup, total: dashboard.totalInGroup })
                          : td("gaugeCaptionNoData")
                      }
                    />
                    {dashboard.pendingInGroup > 0 && (
                      <form action={sendConsentReminder} className="mt-3">
                        <input type="hidden" name="groupId" value={activeGroup.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button className="w-full inline-flex items-center justify-center gap-1.5 border border-border rounded-md px-3 py-2 text-sm text-inksoft hover:border-accent hover:text-accent-dark">
                          <IconArrowRight size={14} stroke={2} aria-hidden="true" />
                          {td("reminderButton", { count: dashboard.pendingInGroup })}
                        </button>
                      </form>
                    )}
                    {reminderBanner && (
                      <p role="status" className="text-inksoft text-xs mt-2 border border-border rounded-md px-3 py-2">
                        {reminderBanner}
                      </p>
                    )}
                  </div>
                </section>

                <div className="bg-panel border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{activeGroup.name}</caption>
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableStudent")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableConsent")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableSessions")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableMinutes")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableMood")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("tableBridges")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroup.students.map((student) => {
                        const summary = latestByStudent.get(student.id);
                        const openBridges = openBridgeByStudent.get(student.id) ?? 0;
                        const hasConsent = student.consentStatus === "GRANTED";

                        return (
                          <tr key={student.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 text-ink font-medium">{student.alias}</td>
                            <td className="px-4 py-3">
                              <ConsentBadge status={student.consentStatus} />
                            </td>
                            {!hasConsent ? (
                              <td colSpan={3} className="px-4 py-3 text-muted italic">
                                {t("noConsent")}
                              </td>
                            ) : summary ? (
                              <>
                                <td className="px-4 py-3 text-ink">{summary.sessionsCount}</td>
                                <td className="px-4 py-3 text-ink">{summary.totalMinutes} min</td>
                                <td className="px-4 py-3">
                                  <MoodTrendTag trend={summary.moodTrend} />
                                </td>
                              </>
                            ) : (
                              <td colSpan={3} className="px-4 py-3 text-muted italic">
                                {t("noData")}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              {openBridges > 0 ? (
                                <span className="inline-flex items-center gap-1 text-warning-text font-medium">
                                  <IconArrowRight size={14} stroke={2} aria-hidden="true" />
                                  {t("bridgesActive", { count: openBridges })}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <footer className="border border-border rounded-lg px-4 py-3 mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-inksoft">
                    WCAG 2.1 AA
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-inksoft">
                    RGPD / LOPD-GDD
                  </span>
                  <p className="text-muted text-xs flex-1 min-w-[200px]">{t("footerNote")}</p>
                </footer>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
