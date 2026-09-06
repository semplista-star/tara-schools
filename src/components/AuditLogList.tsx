import { useFormatter, useTranslations } from "next-intl";

export default function AuditLogList({
  entries
}: {
  entries: { id: string; action: string; createdAt: Date; actor: { name: string; role: string } }[];
}) {
  const t = useTranslations("auditActions");
  const tDash = useTranslations("referenteDashboard");
  const format = useFormatter();

  if (entries.length === 0) {
    return <p className="text-muted text-sm">{tDash("noAudit")}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
          <span className="text-inksoft">
            <strong className="text-ink font-medium">{entry.actor.name}</strong>{" "}
            {t.has(entry.action) ? t(entry.action) : entry.action}
          </span>
          <span className="text-muted text-xs whitespace-nowrap">
            {format.dateTime(entry.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
