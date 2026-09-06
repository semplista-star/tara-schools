import { ConsentStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { IconCheck, IconClock, IconX } from "@tabler/icons-react";

const CONFIG: Record<ConsentStatus, { className: string; Icon: typeof IconCheck }> = {
  GRANTED: { className: "text-success-text bg-success-light", Icon: IconCheck },
  PENDING: { className: "text-warning-text bg-warning-light", Icon: IconClock },
  DENIED: { className: "text-danger-text bg-danger-light", Icon: IconX }
};

export default function ConsentBadge({ status }: { status: ConsentStatus }) {
  const t = useTranslations("consentBadge");
  const { className, Icon } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {t(status)}
    </span>
  );
}
