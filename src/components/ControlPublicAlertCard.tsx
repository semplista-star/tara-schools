import { AlertSeverity, AlertStatus } from "@prisma/client";
import { useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import SeverityBadge from "@/components/SeverityBadge";
import AlertStatusBadge from "@/components/AlertStatusBadge";

const TINT: Record<AlertSeverity, string> = {
  LOW: "bg-warning-light/60 border-warning/30",
  MEDIUM: "bg-warning-light/60 border-warning/30",
  HIGH: "bg-danger-light/60 border-danger/30",
  CRITICAL: "bg-danger-light/60 border-danger/30"
};

export default function ControlPublicAlertCard({
  alert
}: {
  alert: {
    id: string;
    severity: AlertSeverity;
    status: AlertStatus;
    category: string;
    createdAt: Date;
    visitor: { codi: string; lang: string };
  };
}) {
  const format = useFormatter();

  return (
    <Link
      href={`/control/alertas/${alert.id}`}
      className={`block rounded-lg border p-4 hover:border-accent transition-colors ${TINT[alert.severity]}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <SeverityBadge severity={alert.severity} />
        <AlertStatusBadge status={alert.status} />
      </div>
      <p className="text-ink font-medium">
        {alert.visitor.codi} <span className="text-muted font-normal">· {alert.visitor.lang.toUpperCase()}</span>
      </p>
      <p className="text-inksoft text-sm mt-1">{alert.category}</p>
      <p className="text-muted text-xs mt-2">
        {format.dateTime(alert.createdAt, { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </Link>
  );
}
