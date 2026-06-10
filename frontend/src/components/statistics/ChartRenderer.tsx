"use client";

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, CartesianGrid, Legend 
} from "recharts";

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface ChartRendererProps {
  type: "bar" | "line" | "pie" | "area" | "scatter" | "histogram";
  data: ChartData[];
  barHorizontal?: boolean;
}

export default function ChartRenderer({ type, data, barHorizontal = false }: ChartRendererProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
        Nenhum dado disponível para exibir.
      </div>
    );
  }

  const scatterData = data.map((item, index) => ({
    x: index,
    name: item.name,
    value: item.value,
    fill: item.fill
  }));

  const tooltipStyle = {
    backgroundColor: 'var(--bg)', 
    borderColor: 'var(--color-border)', 
    borderRadius: '8px',
    color: 'var(--text)'
  };

  const renderChartContent = () => {
    switch (type) {
      case "line":
        const lineColor = data[1]?.fill || data[0]?.fill || "#3b82f6";
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="value" name="Tarefas" stroke={lineColor} strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
          </LineChart>
        );
        
      case "pie":
        return (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Pie 
              data={data} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              outerRadius={120} 
              innerRadius={60}
              paddingAngle={5}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        );
        
      case "area":
        const areaColor = data[1]?.fill || data[0]?.fill || "#3b82f6";
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="value" name="Tarefas" stroke={areaColor} fill={areaColor} fillOpacity={0.3} />
          </AreaChart>
        );
        
      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="category" dataKey="name" name="Status" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis type="number" dataKey="value" name="Tarefas" allowDecimals={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
            <Legend />
            <Scatter name="Quantidade de Tarefas" data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        );
        
      case "histogram":
      case "bar":
      default:
        const isHist = type === "histogram";
        const layoutMode = barHorizontal ? "vertical" : "horizontal";
        return (
          <BarChart data={data} layout={layoutMode} barCategoryGap={isHist ? "0%" : "10%"}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={!barHorizontal} horizontal={barHorizontal} />
            {barHorizontal ? (
              <>
                <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} hide />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
              </>
            )}
            <Tooltip cursor={{ fill: 'var(--bg-3)' }} contentStyle={tooltipStyle} />
            <Legend />
            <Bar 
              dataKey="value" 
              name="Tarefas" 
              radius={isHist ? 0 : [6, 6, 6, 6]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={isHist ? 0.8 : 1} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      {renderChartContent()}
    </ResponsiveContainer>
  );
}
