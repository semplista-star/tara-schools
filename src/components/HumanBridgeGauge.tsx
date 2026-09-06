import CircularGauge from "@/components/CircularGauge";

export default function HumanBridgeGauge({ resolved, total }: { resolved: number; total: number }) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  return (
    <CircularGauge
      label="Puentes humanos atendidos"
      pct={pct}
      hasData={total > 0}
      caption={total > 0 ? `${resolved} de ${total} atendidos` : "Todavía no hay puentes humanos registrados"}
    />
  );
}
