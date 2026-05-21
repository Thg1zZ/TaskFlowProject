"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, CartesianGrid, Legend 
} from "recharts";
import { Loader2, PieChart as PieIcon, LayoutDashboard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import clsx from "clsx";

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

const COLORS = [
  "#3b82f6", // Blue (default)
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4"  // Cyan
];

export default function StatisticsPage() {
  const { data: tasks, error, isLoading } = useSWR<Task[]>("/tasks", tasksApi.getAll);
  
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [primaryColor, setPrimaryColor] = useState<string>(COLORS[0]);

  // Aggregating data for KPIs
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, todo: 0, inProgress: 0, done: 0 };
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
    };
  }, [tasks]);

  // Aggregating data for the Chart
  const chartData = useMemo(() => {
    return [
      { name: "A Fazer", value: stats.todo, fill: primaryColor },
      { name: "Em Progresso", value: stats.inProgress, fill: primaryColor },
      { name: "Concluídas", value: stats.done, fill: primaryColor }
    ];
  }, [stats, primaryColor]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--red)]">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p>Não foi possível carregar os dados estatísticos.</p>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: 'var(--bg)', borderColor: 'var(--color-border)', borderRadius: '8px'}} />
            <Legend />
            <Line type="monotone" dataKey="value" name="Quantidade" stroke={primaryColor} strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
          </LineChart>
        );
      case "pie":
        // For pie chart we might want varying opacities to distinguish sections if using a single primary color
        const pieColors = [primaryColor, `${primaryColor}cc`, `${primaryColor}88`];
        return (
          <PieChart>
            <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg)', borderColor: 'var(--color-border)', borderRadius: '8px'}} />
            <Legend />
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg)', borderColor: 'var(--color-border)', borderRadius: '8px'}} />
            <Legend />
            <Area type="monotone" dataKey="value" name="Quantidade" stroke={primaryColor} fill={primaryColor} fillOpacity={0.3} />
          </AreaChart>
        );
      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis dataKey="value" name="Tarefas" />
            <RechartsTooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{backgroundColor: 'var(--bg)', borderColor: 'var(--color-border)', borderRadius: '8px'}} />
            <Legend />
            <Scatter name="Quantidade" data={chartData} fill={primaryColor} />
          </ScatterChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip cursor={{fill: 'var(--bg-3)'}} contentStyle={{backgroundColor: 'var(--bg)', borderColor: 'var(--color-border)', borderRadius: '8px'}} />
            <Legend />
            <Bar dataKey="value" name="Quantidade" fill={primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Estatísticas</h1>
          <p className="text-[var(--text-2)] text-sm mt-1">Acompanhe seu progresso e a distribuição das suas tarefas.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Total de Tarefas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--orange)]/10 text-[var(--orange)] flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">A Fazer</p>
            <p className="text-2xl font-bold">{stats.todo}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--blue)]/10 text-[var(--blue)] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Em Progresso</p>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Concluídas</p>
            <p className="text-2xl font-bold">{stats.done}</p>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex-1 flex flex-col min-h-[450px]">
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Distribuição por Status</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            
            {/* Color Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-muted-foreground)] mr-2">Cor:</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimaryColor(c)}
                  className={clsx(
                    "w-6 h-6 rounded-full transition-transform",
                    primaryColor === c ? "scale-125 ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--accent)]" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {/* Chart Type Selector */}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="bg-[var(--bg)] border border-[var(--color-border)] text-sm rounded-[var(--radius)] px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="bar">Gráfico de Colunas/Barras</option>
              <option value="line">Gráfico de Linhas</option>
              <option value="pie">Gráfico de Pizza (Setores)</option>
              <option value="area">Gráfico de Área</option>
              <option value="scatter">Gráfico de Dispersão</option>
            </select>

          </div>
        </div>

        {/* Recharts Container */}
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
      </div>
    </div>
  );
}
