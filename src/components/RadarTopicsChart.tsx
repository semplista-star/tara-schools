"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
} from "chart.js";
import { Radar } from "react-chartjs-2";
import EmptyChartState from "@/components/EmptyChartState";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export default function RadarTopicsChart({
  title,
  labels,
  values,
  empty
}: {
  title: string;
  labels: string[];
  values: number[];
  empty?: { title: string; body: string };
}) {
  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <p className="text-muted text-sm mb-3">{title}</p>
      {empty ? (
        <EmptyChartState title={empty.title} body={empty.body} />
      ) : (
        <div style={{ height: 220 }}>
          <Radar
            data={{
              labels,
              datasets: [
                {
                  data: values,
                  borderColor: "#2a78d6",
                  backgroundColor: "rgba(42, 120, 214, 0.12)",
                  pointBackgroundColor: "#2a78d6",
                  borderWidth: 2
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                r: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, precision: 0, backdropColor: "transparent" },
                  grid: { color: "#EFF3F8" },
                  angleLines: { color: "#EFF3F8" },
                  pointLabels: { color: "#4B5A68", font: { size: 11 } }
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
