"use client"

import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

interface RequestTypeChartProps {
  data: { label: string, value: number }[]
}

function generateColour(label: string) {
    let hash = 0;
    const triple_base_64_label = btoa(btoa(btoa(label)));
    for (let i = 0; i < triple_base_64_label.length; i++) {
        hash = triple_base_64_label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 100%, 50%)`;
};

export default function RequestTypeChart({ data }: RequestTypeChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    const chart_data = {
        labels: data.map(x => x.label),
        datasets: [
            {
                data: data.map(x => x.value),
                backgroundColor: data.map(x => generateColour(x.label)),
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "right" as const,
                labels: {
                    color: "#fff",
                    padding: 15,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                titleColor: "#fff",
                bodyColor: "#fff",
                // borderColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 0,
                padding: 12,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed
                        const percentage = ((value / total) * 100).toFixed(1)
                        return `${value.toLocaleString()} (${percentage}%)`
                    },
                },
            },
        },
    }
    return (
        <div style={{ width: "100%", height: "100%"}}>
            <Pie data={chart_data} options={options} />
        </div>
    )
}
