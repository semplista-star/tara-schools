const ACTION_LABELS: Record<string, string> = {
  VIEW_GROUP_SUMMARY: "Consultó el resumen de un grupo",
  VIEW_SAFETY_ALERT: "Consultó el detalle de una alerta",
  ACKNOWLEDGE_SAFETY_ALERT: "Se hizo cargo de una alerta",
  RESOLVE_SAFETY_ALERT: "Resolvió una alerta",
  ADD_SAFETY_ALERT_NOTE: "Añadió una nota a una alerta",
  REQUEST_ADDITIONAL_CONTEXT: "Solicitó contexto adicional",
  VIEW_SCHOOL_AGGREGATE: "Consultó agregados del centro",
  EXPORT_REPORT: "Exportó un informe"
};

export default function AuditLogList({
  entries
}: {
  entries: { id: string; action: string; createdAt: Date; actor: { name: string; role: string } }[];
}) {
  if (entries.length === 0) {
    return <p className="text-muted text-sm">Todavía no hay actividad registrada.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
          <span className="text-inksoft">
            <strong className="text-ink font-medium">{entry.actor.name}</strong>{" "}
            {ACTION_LABELS[entry.action] ?? entry.action}
          </span>
          <span className="text-muted text-xs whitespace-nowrap">
            {entry.createdAt.toLocaleString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
