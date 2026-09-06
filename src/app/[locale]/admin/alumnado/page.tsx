import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ConsentBadge from "@/components/ConsentBadge";
import { updateConsentStatus } from "@/app/[locale]/admin/actions";

const STATUS_OPTIONS = ["GRANTED", "PENDING", "DENIED"] as const;

export default async function AlumnadoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminStudents" });
  const tStatus = await getTranslations({ locale, namespace: "consentStatus" });
  const user = await requireStaff(["ADMIN"]);

  const groups = await prisma.group.findMany({
    where: { schoolId: user.schoolId },
    include: { students: { orderBy: { alias: "asc" } } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-ink text-lg font-semibold">{t("heading")}</h2>
        <p className="text-muted text-sm">{t("subheading")}</p>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="bg-panel border border-border rounded-lg overflow-hidden">
          <p className="px-4 py-3 text-ink font-medium border-b border-border">{group.name}</p>
          <table className="w-full text-sm">
            <caption className="sr-only">{group.name}</caption>
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th scope="col" className="px-4 py-2 font-medium">{t("tableStudent")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("tableStatus")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("tableChangeTo")}</th>
              </tr>
            </thead>
            <tbody>
              {group.students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink">{student.alias}</td>
                  <td className="px-4 py-3">
                    <ConsentBadge status={student.consentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateConsentStatus} className="flex items-center gap-2">
                      <input type="hidden" name="studentId" value={student.id} />
                      <label htmlFor={`status-${student.id}`} className="sr-only">
                        {t("changeAria", { name: student.alias })}
                      </label>
                      <select
                        id={`status-${student.id}`}
                        name="status"
                        defaultValue={student.consentStatus}
                        className="border border-border rounded-md px-2 py-1.5 text-sm bg-canvas"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {tStatus(s)}
                          </option>
                        ))}
                      </select>
                      <button className="border border-border rounded-md px-3 py-1.5 text-sm text-inksoft hover:border-accent hover:text-accent">
                        {t("saveButton")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
