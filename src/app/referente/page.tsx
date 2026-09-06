import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/SignOutButton";

export default async function ReferentePage() {
  const user = await requireStaff(["WELLBEING_REFERENT"]);
  const openAlerts = await prisma.safetyAlert.count({
    where: { schoolId: user.schoolId, status: { not: "RESOLVED" } }
  });

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Panel de referente de bienestar</p>
          <h1 className="text-lg font-semibold text-ink">Alertas de seguridad</h1>
        </div>
        <SignOutButton />
      </header>
      <main className="p-6">
        <p className="text-inksoft mb-4">
          Sesión iniciada como <strong>{user.name}</strong> (referente de bienestar).
        </p>
        <p className="text-ink">
          Alertas abiertas: <strong>{openAlerts}</strong>
        </p>
        <p className="text-muted text-sm mt-6">
          El detalle de alertas, notas y registro de auditoría se construirá en el bloque de seguridad.
        </p>
      </main>
    </div>
  );
}
