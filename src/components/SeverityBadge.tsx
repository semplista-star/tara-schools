import { AlertSeverity } from "@prisma/client";
import { IconAlertOctagon, IconAlertTriangle } from "@tabler/icons-react";

const CONFIG: Record<AlertSeverity, { label: string; className: string; Icon: typeof IconAlertTriangle }> = {
  LOW: { label: "Prioridad baja", className: "text-warning bg-warning-light", Icon: IconAlertTriangle },
  MEDIUM: { label: "Prioridad media", className: "text-warning bg-warning-light", Icon: IconAlertTriangle },
  HIGH: { label: "Prioridad alta", className: "text-danger bg-danger-light", Icon: IconAlertOctagon },
  CRITICAL: { label: "Prioridad crítica", className: "text-danger bg-danger-light", Icon: IconAlertOctagon }
};

export default function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { label, className, Icon } = CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {label}
    </span>
  );
}
