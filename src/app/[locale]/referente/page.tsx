import { IconAlertOctagon, IconCircleCheck, IconEye } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/SignOutButton";
import StatCard from "@/components/StatCard";
import HumanBridgeGauge from "@/components/HumanBridgeGauge";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import AlertCard from "@/components/AlertCard";
import AuditLogList from "@/components/AuditLogList";
import { weekBuckets } from "@/lib/weeks";

export default async function ReferentePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referenteDashboard" });
  const user = await requireStaff(["WELLBEING_REFERENT"]);

  const [openCount, inReviewCount, resolvedThisMonthCount, activeAlerts, recentResolved, bridgeTotal, bridgeResolved, auditEntries] =
    await Promise.all([
      prisma.safetyAlert.count({ where: { schoolId: user.schoolId, status: "OPEN" } }),
      prisma.safetyAlert.count({ where: { schoolId: user.schoolId, status: "IN_REVIEW" } }),
      prisma.safetyAlert.count({
        where: {
          schoolId: user.schoolId,
          status: "RESOLVED",
          resolvedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.safetyAlert.findMany({
        where: { schoolId: user.schoolId, status: { in: ["OPEN", "IN_REVIEW"] } },
        include: { student: { include: { group: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }]
      }),
      prisma.safetyAlert.findMany({
        where: { schoolId: user.schoolId, status: "RESOLVED" },
        include: { student: { include: { group: true } } },
        orderBy: { resolvedAt: "desc" },
        take: 5
      }),
      prisma.humanBridgeEvent.count({ where: { student: { schoolId: user.schoolId } } }),
      prisma.humanBridgeEvent.count({ where: { student: { schoolId: user.schoolId }, resolved: true } }),
      prisma.auditLog.findMany({
        where: { schoolId: user.schoolId },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 15
      })
    ]);

  const buckets = weekBuckets(8, locale);
  const alertsForTrend = await prisma.safetyAlert.findMany({
    where: { schoolId: user.schoolId, createdAt: { gte: buckets[0].start } },
    select: { createdAt: true }
  });
  const trendValues = buckets.map(
    (b) => alertsForTrend.filter((a) => a.createdAt >= b.start && a.createdAt < b.end).length
  );

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("panelLabel")}</p>
          <h1 className="text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="p-6 max-w-5xl mx-auto w-full flex-1 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label={t("statOpen")} value={openCount} Icon={IconAlertOctagon} tone="danger" />
          <StatCard label={t("statInReview")} value={inReviewCount} Icon={IconEye} tone="warning" />
          <StatCard label={t("statResolved")} value={resolvedThisMonthCount} Icon={IconCircleCheck} tone="success" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <WeeklyTrendChart title={t("chartTitle")} labels={buckets.map((b) => b.label)} values={trendValues} />
          <HumanBridgeGauge resolved={bridgeResolved} total={bridgeTotal} />
        </section>

        <section>
          <h2 className="text-ink font-medium mb-3">{t("activeAlertsHeading")}</h2>
          {activeAlerts.length === 0 ? (
            <p className="text-muted text-sm">{t("noActiveAlerts")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </section>

        {recentResolved.length > 0 && (
          <section>
            <h2 className="text-ink font-medium mb-3">{t("resolvedHeading")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentResolved.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        )}

        <section className="bg-panel border border-border rounded-lg p-5">
          <h2 className="text-ink font-medium mb-1">{t("auditHeading")}</h2>
          <p className="text-muted text-xs mb-3">{t("auditNote")}</p>
          <AuditLogList entries={auditEntries} />
        </section>
      </main>
    </div>
  );
}
