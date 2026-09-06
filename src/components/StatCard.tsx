import { IconProps } from "@tabler/icons-react";
import { ComponentType } from "react";

export default function StatCard({
  label,
  value,
  Icon,
  tone = "ink"
}: {
  label: string;
  value: string | number;
  Icon: ComponentType<IconProps>;
  tone?: "ink" | "danger" | "warning" | "success";
}) {
  const toneClass = {
    ink: "text-ink",
    danger: "text-danger-text",
    warning: "text-warning-text",
    success: "text-success-text"
  }[tone];

  return (
    <div className="bg-panel border border-border rounded-lg p-5 flex items-start justify-between">
      <div>
        <p className="text-muted text-sm mb-1">{label}</p>
        <p className={`font-serif text-4xl ${toneClass}`}>{value}</p>
      </div>
      <Icon size={22} stroke={1.75} className="text-muted" aria-hidden="true" />
    </div>
  );
}
