import { IconCheck, IconMinus } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { meetsKAnonymity, K_ANONYMITY_MIN } from "@/lib/kanonymity";
import { assignTutor, unassignTutor } from "@/app/[locale]/admin/actions";
import { Link } from "@/i18n/navigation";

export default async function GruposPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminGroups" });
  const user = await requireStaff(["ADMIN"]);

  const [groups, tutors] = await Promise.all([
    prisma.group.findMany({
      where: { schoolId: user.schoolId },
      include: { students: { select: { consentStatus: true } }, tutors: true },
      orderBy: { name: "asc" }
    }),
    prisma.staffUser.findMany({ where: { schoolId: user.schoolId, role: "TUTOR" }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-ink text-lg font-semibold">{t("heading")}</h2>
        <p className="text-muted text-sm">{t("subheading", { min: K_ANONYMITY_MIN })}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const activeCount = group.students.filter((s) => s.consentStatus === "GRANTED").length;
          const hasData = meetsKAnonymity(activeCount);
          const assignedIds = new Set(group.tutors.map((tutor) => tutor.id));
          const availableTutors = tutors.filter((tutor) => !assignedIds.has(tutor.id));

          return (
            <div key={group.id} className="bg-panel border border-border rounded-lg p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <Link href={`/admin/grupos/${group.id}`} className="text-ink font-medium hover:text-accent">
                    {group.name}
                  </Link>
                  <p className="text-muted text-sm">{t("studentsCount", { count: group.students.length, active: activeCount })}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    hasData ? "text-success bg-success-light" : "text-warning bg-warning-light"
                  }`}
                >
                  {hasData ? <IconCheck size={14} stroke={2} aria-hidden="true" /> : <IconMinus size={14} stroke={2} aria-hidden="true" />}
                  {hasData ? t("dataAvailable") : t("dataInsufficient")}
                </span>
              </div>

              <p className="text-inksoft text-sm mb-2">{t("tutorsAssignedLabel")}</p>
              {group.tutors.length === 0 ? (
                <p className="text-muted text-sm mb-3">{t("noTutors")}</p>
              ) : (
                <ul className="flex flex-wrap gap-2 mb-3">
                  {group.tutors.map((tutor) => (
                    <li key={tutor.id}>
                      <form action={unassignTutor} className="inline-flex items-center gap-1.5 border border-border rounded-full pl-3 pr-1 py-1 text-sm">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="staffId" value={tutor.id} />
                        <span className="text-ink">{tutor.name}</span>
                        <button
                          type="submit"
                          aria-label={t("removeTutorAria", { name: tutor.name, group: group.name })}
                          className="text-muted hover:text-danger px-1"
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {availableTutors.length > 0 && (
                <form action={assignTutor} className="flex items-center gap-2">
                  <input type="hidden" name="groupId" value={group.id} />
                  <label htmlFor={`assign-${group.id}`} className="sr-only">
                    {t("assignPlaceholder")}
                  </label>
                  <select
                    id={`assign-${group.id}`}
                    name="staffId"
                    defaultValue=""
                    className="border border-border rounded-md px-2 py-1.5 text-sm bg-canvas"
                  >
                    <option value="" disabled>
                      {t("assignPlaceholder")}
                    </option>
                    {availableTutors.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name}
                      </option>
                    ))}
                  </select>
                  <button className="border border-border rounded-md px-3 py-1.5 text-sm text-inksoft hover:border-accent hover:text-accent">
                    {t("assignButton")}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
