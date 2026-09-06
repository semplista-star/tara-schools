import { AlertStatus } from "@prisma/client";
import { IconCircleCheck, IconEye, IconExclamationCircle } from "@tabler/icons-react";

const CONFIG: Record<AlertStatus, { label: string; className: string; Icon: typeof IconEye }> = {
  OPEN: { label: "Abierta", className: "text-danger bg-danger-light", Icon: IconExclamationCircle },
  IN_REVIEW: { label: "En revisión", className: "text-warning bg-warning-light", Icon: IconEye },
  RESOLVED: { label: "Resuelta", className: "text-success bg-success-light", Icon: IconCircleCheck }
};

export default function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const { label, className, Icon } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {label}
    </span>
  );
}
