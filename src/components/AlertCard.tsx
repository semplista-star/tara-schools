import Link from "next/link";
import { AlertSeverity, AlertStatus } from "@prisma/client";
import SeverityBadge from "@/components/SeverityBadge";
import AlertStatusBadge from "@/components/AlertStatusBadge";

const TINT: Record<AlertSeverity, string> = {
  LOW: "bg-warning-light/60 border-warning/30",
  MEDIUM: "bg-warning-light/60 border-warning/30",
  HIGH: "bg-danger-light/60 border-danger/30",
  CRITICAL: "bg-danger-light/60 border-danger/30"
};

export default function AlertCard({
  alert
}: {
  alert: {
    id: string;
    severity: AlertSeverity;
    status: AlertStatus;
    summary: string;
    createdAt: Date;
    student: { alias: string; group: { name: string } };
  };
}) {
  return (
    <Link
      href={`/referente/alertas/${alert.id}`}
      className={`block rounded-lg border p-4 hover:border-accent transition-colors ${TINT[alert.severity]}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <SeverityBadge severity={alert.severity} />
        <AlertStatusBadge status={alert.status} />
      </div>
      <p className="text-ink font-medium">
        {alert.student.alias} <span className="text-muted font-normal">· {alert.student.group.name}</span>
      </p>
      <p className="text-inksoft text-sm mt-1 line-clamp-2">{alert.summary}</p>
      <p className="text-muted text-xs mt-2">
        {alert.createdAt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </Link>
  );
}
