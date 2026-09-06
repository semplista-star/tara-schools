import Link from "next/link";
import { IconArrowRight, IconUsersGroup } from "@tabler/icons-react";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import SignOutButton from "@/components/SignOutButton";
import ConsentBadge from "@/components/ConsentBadge";
import MoodTrendTag from "@/components/MoodTrendTag";

export default async function TutorPage({
  searchParams
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const user = await requireStaff(["TUTOR"]);
  const { grupo } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { schoolId: user.schoolId, tutors: { some: { id: user.id } } },
    include: { students: { orderBy: { alias: "asc" } } },
    orderBy: { name: "asc" }
  });

  const activeGroup = groups.find((g) => g.id === grupo) ?? groups[0];

  let latestByStudent = new Map<string, { periodStart: Date; sessionsCount: number; totalMinutes: number; moodTrend: string | null }>();
  let openBridgeByStudent = new Map<string, number>();

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

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Panel de tutoría</p>
          <h1 className="text-lg font-semibold text-ink">Progreso de mis grupos</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {groups.length === 0 ? (
          <p className="text-muted text-sm">Todavía no tienes grupos asignados.</p>
        ) : (
          <>
            {groups.length > 1 && (
              <nav className="flex gap-2 mb-6" aria-label="Selección de grupo">
                {groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/tutor?grupo=${g.id}`}
                    aria-current={g.id === activeGroup?.id ? "page" : undefined}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      g.id === activeGroup?.id
                        ? "border-accent text-accent bg-accent-light"
                        : "border-border text-inksoft hover:border-accent-dark"
                    }`}
                  >
                    {g.name}
                  </Link>
                ))}
              </nav>
            )}

            {activeGroup && (
              <>
                <div className="flex items-center gap-2 mb-4 text-inksoft">
                  <IconUsersGroup size={20} stroke={1.75} aria-hidden="true" />
                  <h2 className="font-medium">{activeGroup.name}</h2>
                  <span className="text-muted text-sm">· {activeGroup.students.length} alumnos/as</span>
                </div>

                <div className="bg-panel border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="px-4 py-3 font-medium">Alumno/a</th>
                        <th className="px-4 py-3 font-medium">Consentimiento</th>
                        <th className="px-4 py-3 font-medium">Sesiones</th>
                        <th className="px-4 py-3 font-medium">Minutos</th>
                        <th className="px-4 py-3 font-medium">Tendencia de ánimo</th>
                        <th className="px-4 py-3 font-medium">Puentes humanos</th>
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
                                Sin datos: falta consentimiento familiar
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
                                Todavía no hay datos de uso
                              </td>
                            )}
                            <td className="px-4 py-3">
                              {openBridges > 0 ? (
                                <span className="inline-flex items-center gap-1 text-warning font-medium">
                                  <IconArrowRight size={14} stroke={2} aria-hidden="true" />
                                  {openBridges} activo{openBridges > 1 ? "s" : ""}
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

                <p className="text-muted text-xs mt-4">
                  Los datos mostrados son agregados y anónimos: nunca el contenido literal de las conversaciones del
                  alumnado con Tara.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
