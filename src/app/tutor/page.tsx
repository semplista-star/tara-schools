import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/SignOutButton";

export default async function TutorPage() {
  const user = await requireStaff(["TUTOR"]);
  const groups = await prisma.group.findMany({
    where: { schoolId: user.schoolId, tutors: { some: { id: user.id } } },
    include: { students: true }
  });

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Panel de tutoría</p>
          <h1 className="text-lg font-semibold text-ink">Mis grupos</h1>
        </div>
        <SignOutButton />
      </header>
      <main className="p-6">
        <p className="text-inksoft mb-4">
          Sesión iniciada como <strong>{user.name}</strong> (tutoría).
        </p>
        {groups.length === 0 ? (
          <p className="text-muted text-sm">Todavía no tienes grupos asignados.</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="bg-panel border border-border rounded-lg px-4 py-3">
                <p className="text-ink font-medium">{g.name}</p>
                <p className="text-muted text-sm">{g.students.length} alumnos/as</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted text-sm mt-6">
          Los datos de progreso agregado por grupo se construirán en el siguiente bloque.
        </p>
      </main>
    </div>
  );
}
