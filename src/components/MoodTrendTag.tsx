import { useTranslations } from "next-intl";
import { IconMinus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

const CONFIG: Record<string, { className: string; Icon: typeof IconTrendingUp }> = {
  mejora: { className: "text-success-text", Icon: IconTrendingUp },
  estable: { className: "text-inksoft", Icon: IconMinus },
  empeora: { className: "text-danger-text", Icon: IconTrendingDown }
};

export default function MoodTrendTag({ trend }: { trend: string | null }) {
  const t = useTranslations("moodTrend");

  if (!trend || !CONFIG[trend]) {
    return <span className="text-muted text-sm">—</span>;
  }
  const { className, Icon } = CONFIG[trend];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${className}`}>
      <Icon size={16} stroke={2} aria-hidden="true" />
      {t(trend)}
    </span>
  );
}
