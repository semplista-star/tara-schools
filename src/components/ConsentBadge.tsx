import { ConsentStatus } from "@prisma/client";
import { IconCheck, IconClock, IconX } from "@tabler/icons-react";

const CONFIG: Record<ConsentStatus, { label: string; className: string; Icon: typeof IconCheck }> = {
  GRANTED: { label: "Consentimiento concedido", className: "text-success bg-success-light", Icon: IconCheck },
  PENDING: { label: "Consentimiento pendiente", className: "text-warning bg-warning-light", Icon: IconClock },
  DENIED: { label: "Consentimiento denegado", className: "text-danger bg-danger-light", Icon: IconX }
};

export default function ConsentBadge({ status }: { status: ConsentStatus }) {
  const { label, className, Icon } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon size={14} stroke={2} aria-hidden="true" />
      {label}
    </span>
  );
}
