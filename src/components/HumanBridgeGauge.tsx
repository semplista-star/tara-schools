export default function HumanBridgeGauge({ resolved, total }: { resolved: number; total: number }) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-panel border border-border rounded-lg p-5 flex flex-col items-center">
      <p className="text-muted text-sm self-start mb-3">Puentes humanos atendidos</p>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${pct}% de puentes humanos atendidos`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#EFF3F8" strokeWidth="12" />
        {total > 0 && (
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#2a78d6"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
          />
        )}
        <text x="70" y="76" textAnchor="middle" fontSize="28" fontFamily="Georgia, serif" fill="#16202B">
          {total > 0 ? `${pct}%` : "—"}
        </text>
      </svg>
      <p className="text-muted text-xs mt-2">
        {total > 0 ? `${resolved} de ${total} atendidos` : "Todavía no hay puentes humanos registrados"}
      </p>
    </div>
  );
}
