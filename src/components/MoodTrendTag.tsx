import { IconMinus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

const CONFIG: Record<string, { label: string; className: string; Icon: typeof IconTrendingUp }> = {
  mejora: { label: "Mejora", className: "text-success", Icon: IconTrendingUp },
  estable: { label: "Estable", className: "text-inksoft", Icon: IconMinus },
  empeora: { label: "Empeora", className: "text-danger", Icon: IconTrendingDown }
};

export default function MoodTrendTag({ trend }: { trend: string | null }) {
  if (!trend || !CONFIG[trend]) {
    return <span className="text-muted text-sm">—</span>;
  }
  const { label, className, Icon } = CONFIG[trend];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${className}`}>
      <Icon size={16} stroke={2} aria-hidden="true" />
      {label}
    </span>
  );
}
