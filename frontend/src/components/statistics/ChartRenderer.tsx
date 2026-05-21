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
  type: "bar" | "line" | "pie" | "area" | "scatter";
  data: ChartData[];
  color: string;
}

export default function ChartRenderer({ type, data, color }: ChartRendererProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
        Nenhum dado disponível para exibir.
      </div>
    );
  }

  // Format ScatterChart data to ensure X and Y exist properly
  const scatterData = data.map((item, index) => ({
    x: index,
    name: item.name,
    value: item.value,
    fill: item.fill
  }));

  const pieColors = [color, `${color}bb`, `${color}77`, `${color}33`];

  const tooltipStyle = {
    backgroundColor: 'var(--bg)', 
    borderColor: 'var(--color-border)', 
    borderRadius: '8px',
    color: 'var(--text)'
  };

  const renderChartContent = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="value" name="Tarefas" stroke={color} strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
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
              label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
        
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="value" name="Tarefas" stroke={color} fill={color} fillOpacity={0.3} />
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
            <Scatter name="Quantidade de Tarefas" data={scatterData} fill={color} />
          </ScatterChart>
        );
        
      case "bar":
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--bg-3)' }} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="value" name="Tarefas" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        );
    }
  };

  // We wrap the dynamic chart in a ResponsiveContainer here
  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChartContent()}
    </ResponsiveContainer>
  );
}
