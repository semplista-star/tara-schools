import { AlertSeverity } from "@prisma/client";
import { useTranslations } from "next-intl";
import { IconAlertOctagon, IconAlertTriangle } from "@tabler/icons-react";

const CONFIG: Record<AlertSeverity, { className: string; Icon: typeof IconAlertTriangle }> = {
  LOW: { className: "text-warning-text bg-warning-light", Icon: IconAlertTriangle },
  MEDIUM: { className: "text-warning-text bg-warning-light", Icon: IconAlertTriangle },
  HIGH: { className: "text-danger-text bg-danger-light", Icon: IconAlertOctagon },
  CRITICAL: { className: "text-danger-text bg-danger-light", Icon: IconAlertOctagon }
};

export default function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const t = useTranslations("severity");
  const { className, Icon } = CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {t(severity)}
    </span>
  );
}
