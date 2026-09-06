import { AlertStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { IconCircleCheck, IconEye, IconExclamationCircle } from "@tabler/icons-react";

const CONFIG: Record<AlertStatus, { className: string; Icon: typeof IconEye }> = {
  OPEN: { className: "text-danger-text bg-danger-light", Icon: IconExclamationCircle },
  IN_REVIEW: { className: "text-warning-text bg-warning-light", Icon: IconEye },
  RESOLVED: { className: "text-success-text bg-success-light", Icon: IconCircleCheck }
};

export default function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const t = useTranslations("alertStatus");
  const { className, Icon } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {t(status)}
    </span>
  );
}
