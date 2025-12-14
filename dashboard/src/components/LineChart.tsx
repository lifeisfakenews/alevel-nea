"use client"

import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";

import { formatNumber } from "@/lib/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface ChartProps {
    data: { label: string, value: number }[];
    label: string;
    unit?: string;
}

export default function Chart({ data, label, unit }: ChartProps) {
    const max_data_item = Math.max(...data.map(x => x.value));

    const chart_data = {
        labels: data.map(x => {
            const date = new Date(x.label);
            /* @ts-ignore date can in fact be Invalid Date */
            return date == "Invalid Date" ? x.label : `${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`
        }),
        datasets: [
            {
                label,
                data: data.map(x => x.value),
                borderColor: "hsl(180, 94%, 39%)",
                backgroundColor: "hsl(180, 94%, 29%, .5)",
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => `${context.parsed.y.toLocaleString()} ${unit ?? ""}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                    drawBorder: false,
                },
                ticks: {
                    color: "#fff",
                    maxRotation: 45,
                    minRotation: 45,
                },
            },
            y: {
                beginAtZero: true,
                suggestedMin: 0,
                suggestedMax: max_data_item < 7 ? 10 : (max_data_item * 1.2),
                min: 0,
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                    drawBorder: false,
                },
                ticks: {
                    color: "#fff",
                    callback: (value:any) => formatNumber(value as number),
                    stepSize: max_data_item < 7 ? 1 : undefined
                },
            },
        },
    }

    return (
        <div style={{ width: "100%", height: "100%"}}>
            <Line data={chart_data} options={options} />
        </div>
    )
}
