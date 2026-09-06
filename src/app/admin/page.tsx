import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/SignOutButton";

export default async function AdminPage() {
  const user = await requireStaff(["ADMIN"]);
  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Panel de administración</p>
          <h1 className="text-lg font-semibold text-ink">{school?.name}</h1>
        </div>
        <SignOutButton />
      </header>
      <main className="p-6">
        <p className="text-inksoft">
          Sesión iniciada como <strong>{user.name}</strong> (administración).
        </p>
        <p className="text-muted text-sm mt-2">
          El panel de agregados del centro se construirá en el siguiente bloque.
        </p>
      </main>
    </div>
  );
}
