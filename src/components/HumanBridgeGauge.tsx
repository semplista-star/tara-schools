import { useTranslations } from "next-intl";
import CircularGauge from "@/components/CircularGauge";

export default function HumanBridgeGauge({ resolved, total }: { resolved: number; total: number }) {
  const t = useTranslations("referenteDashboard");
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  return (
    <CircularGauge
      label={t("bridgeGaugeLabel")}
      pct={pct}
      hasData={total > 0}
      caption={total > 0 ? t("bridgeCaptionWithData", { resolved, total }) : t("bridgeCaptionNoData")}
    />
  );
}
