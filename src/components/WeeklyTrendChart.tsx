"use client";

import { CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Legend, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import EmptyChartState from "@/components/EmptyChartState";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip);

export default function WeeklyTrendChart({
  title,
  labels,
  values,
  primaryLabel,
  comparison,
  decimals = false,
  empty
}: {
  title: string;
  labels: string[];
  values: number[];
  primaryLabel?: string;
  comparison?: { label: string; values: number[] };
  decimals?: boolean;
  empty?: { title: string; body: string };
}) {
  if (empty) {
    return (
      <div className="bg-panel border border-border rounded-lg p-5">
        <p className="text-muted text-sm mb-3">{title}</p>
        <EmptyChartState title={empty.title} body={empty.body} />
      </div>
    );
  }

  const datasets = [
    {
      label: primaryLabel ?? title,
      data: values,
      borderColor: "#2a78d6",
      backgroundColor: "#2a78d6",
      pointRadius: 3,
      tension: 0.3
    }
  ];

  if (comparison) {
    datasets.push({
      label: comparison.label,
      data: comparison.values,
      borderColor: "#8C99A6",
      backgroundColor: "#8C99A6",
      pointRadius: 0,
      tension: 0.3,
      // @ts-expect-error -- borderDash is valid for Line datasets, just not in this narrowed type
      borderDash: [6, 4]
    });
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <p className="text-muted text-sm mb-3">{title}</p>
      <div style={{ height: 160 }}>
        <Line
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: Boolean(comparison), position: "bottom", labels: { boxWidth: 16 } } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: decimals ? {} : { stepSize: 1, precision: 0 },
                grid: { color: "#EFF3F8" }
              },
              x: { grid: { display: false } }
            }
          }}
        />
      </div>
    </div>
  );
}
