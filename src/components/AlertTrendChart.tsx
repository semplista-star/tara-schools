"use client";

import { CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export default function AlertTrendChart({ labels, values }: { labels: string[]; values: number[] }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <p className="text-muted text-sm mb-3">Alertas de seguridad por semana</p>
      <div style={{ height: 160 }}>
        <Line
          data={{
            labels,
            datasets: [
              {
                data: values,
                borderColor: "#2a78d6",
                backgroundColor: "#2a78d6",
                pointRadius: 3,
                tension: 0.3
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: "#EFF3F8" } },
              x: { grid: { display: false } }
            }
          }}
        />
      </div>
    </div>
  );
}
