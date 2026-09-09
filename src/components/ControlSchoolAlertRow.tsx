import { AlertSeverity, AlertStatus } from "@prisma/client";
import { useFormatter } from "next-intl";
import SeverityBadge from "@/components/SeverityBadge";
import AlertStatusBadge from "@/components/AlertStatusBadge";

// Solo lectura: a diferencia de las alertas públicas (responsabilidad
// directa del centro de control), resolver una alerta de un centro
// concreto sigue siendo tarea de la referente de bienestar de ese centro.
// /control da visibilidad global, no sustituye ese flujo.
export default function ControlSchoolAlertRow({
  alert
}: {
  alert: {
    id: string;
    severity: AlertSeverity;
    status: AlertStatus;
    createdAt: Date;
    school: { name: string };
    student: { alias: string; group: { name: string } };
  };
}) {
  const format = useFormatter();

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0 flex-wrap">
      <div>
        <p className="text-ink text-sm font-medium">
          {alert.school.name} <span className="text-muted font-normal">· {alert.student.group.name}</span>
        </p>
        <p className="text-muted text-xs mt-0.5">
          {format.dateTime(alert.createdAt, { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge severity={alert.severity} />
        <AlertStatusBadge status={alert.status} />
      </div>
    </div>
  );
}
