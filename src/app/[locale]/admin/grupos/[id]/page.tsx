import { notFound } from "next/navigation";
import { IconArrowLeft, IconClockHour4, IconLock, IconMessageCircle } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { meetsKAnonymity, K_ANONYMITY_MIN } from "@/lib/kanonymity";
import StatCard from "@/components/StatCard";
import { Link } from "@/i18n/navigation";

export default async function GroupDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "adminGroupDetail" });
  const user = await requireStaff(["ADMIN"]);

  const group = await prisma.group.findUnique({
    where: { id },
    include: { students: true }
  });
  if (!group || group.schoolId !== user.schoolId) notFound();

  const activeStudents = group.students.filter((s) => s.consentStatus === "GRANTED");
  const hasData = meetsKAnonymity(activeStudents.length);

  let totals = { sessions: 0, minutes: 0 };
  if (hasData) {
    const summaries = await prisma.usageSummary.aggregate({
      where: { studentId: { in: activeStudents.map((s) => s.id) } },
      _sum: { sessionsCount: true, totalMinutes: true }
    });
    totals = { sessions: summaries._sum.sessionsCount ?? 0, minutes: summaries._sum.totalMinutes ?? 0 };

    await logAudit({
      schoolId: user.schoolId,
      actorId: user.id,
      action: "VIEW_GROUP_AGGREGATE",
      targetType: "Group",
      targetId: group.id
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/grupos" className="inline-flex items-center gap-1.5 text-sm text-inksoft hover:text-accent">
        <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
        {t("back")}
      </Link>

      <div>
        <h2 className="text-ink text-lg font-semibold">{group.name}</h2>
        <p className="text-muted text-sm">
          {t("studentsSummary", { count: group.students.length, active: activeStudents.length })}
        </p>
      </div>

      {!hasData ? (
        <div className="bg-warning-light border border-warning/30 rounded-lg p-6 flex items-start gap-3">
          <IconLock size={20} stroke={1.75} className="text-warning mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-ink font-medium">{t("noDataHeading")}</p>
            <p className="text-inksoft text-sm mt-1">
              {t("noDataBody", { active: activeStudents.length, min: K_ANONYMITY_MIN })}
            </p>
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label={t("statSessions")} value={totals.sessions} Icon={IconMessageCircle} />
          <StatCard label={t("statMinutes")} value={totals.minutes} Icon={IconClockHour4} />
        </section>
      )}
    </div>
  );
}
