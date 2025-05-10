// src/components/charts/TeamPerformanceBarChart.tsx
"use client"

import type { TeamPerformanceDataPoint } from '@/types';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from '@/components/ui/chart';

interface TeamPerformanceBarChartProps {
  data: TeamPerformanceDataPoint[];
  barColor?: string;
  height?: string;
  title?: string;
}

const chartConfig = {
  value: {
    label: "Performance",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


const TeamPerformanceBarChart: React.FC<TeamPerformanceBarChartProps> = ({ data, barColor, height = "200px", title }) => {
  const dynamicChartConfig = {
    value: {
      label: "Performance",
      color: barColor || "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  return (
    <div style={{ height }}>
      {title && <h4 className="text-sm font-semibold mb-2 text-center text-muted-foreground">{title}</h4>}
      <ChartContainer config={dynamicChartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="value" fill={barColor || "var(--color-value)"} radius={4} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default TeamPerformanceBarChart;
