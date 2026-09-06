export default function CircularGauge({
  label,
  pct,
  hasData,
  caption
}: {
  label: string;
  pct: number;
  hasData: boolean;
  caption: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-panel border border-border rounded-lg p-5 flex flex-col items-center">
      <p className="text-muted text-sm self-start mb-3">{label}</p>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${label}: ${caption}`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#EFF3F8" strokeWidth="12" />
        {hasData && (
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
          {hasData ? `${pct}%` : "—"}
        </text>
      </svg>
      <p className="text-muted text-xs mt-2">{caption}</p>
    </div>
  );
}
