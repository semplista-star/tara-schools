import Link from "next/link";
import { IconCheck, IconMinus } from "@tabler/icons-react";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { meetsKAnonymity, K_ANONYMITY_MIN } from "@/lib/kanonymity";
import { assignTutor, unassignTutor } from "@/app/admin/actions";

export default async function GruposPage() {
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
        <h2 className="text-ink text-lg font-semibold">Grupos y tutores</h2>
        <p className="text-muted text-sm">
          Los datos agregados de un grupo solo están disponibles a partir de {K_ANONYMITY_MIN} alumnos activos con
          consentimiento concedido.
        </p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const activeCount = group.students.filter((s) => s.consentStatus === "GRANTED").length;
          const hasData = meetsKAnonymity(activeCount);
          const assignedIds = new Set(group.tutors.map((t) => t.id));
          const availableTutors = tutors.filter((t) => !assignedIds.has(t.id));

          return (
            <div key={group.id} className="bg-panel border border-border rounded-lg p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <Link href={`/admin/grupos/${group.id}`} className="text-ink font-medium hover:text-accent">
                    {group.name}
                  </Link>
                  <p className="text-muted text-sm">
                    {group.students.length} alumnos/as · {activeCount} con consentimiento
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    hasData ? "text-success bg-success-light" : "text-warning bg-warning-light"
                  }`}
                >
                  {hasData ? <IconCheck size={14} stroke={2} aria-hidden="true" /> : <IconMinus size={14} stroke={2} aria-hidden="true" />}
                  {hasData ? "Datos disponibles" : "Datos insuficientes"}
                </span>
              </div>

              <p className="text-inksoft text-sm mb-2">Tutores asignados</p>
              {group.tutors.length === 0 ? (
                <p className="text-muted text-sm mb-3">Sin tutor asignado.</p>
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
                          aria-label={`Quitar a ${tutor.name} de ${group.name}`}
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
                    Asignar tutor a {group.name}
                  </label>
                  <select
                    id={`assign-${group.id}`}
                    name="staffId"
                    defaultValue=""
                    className="border border-border rounded-md px-2 py-1.5 text-sm bg-canvas"
                  >
                    <option value="" disabled>
                      Asignar tutor…
                    </option>
                    {availableTutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button className="border border-border rounded-md px-3 py-1.5 text-sm text-inksoft hover:border-accent hover:text-accent">
                    Asignar
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
