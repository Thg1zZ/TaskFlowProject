"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import { Loader2, PieChart as PieIcon, LayoutDashboard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";

// IMPORTANTE: Carregamos o componente de gráfico dinamicamente com SSR = false
// Isso previne que o Recharts tente renderizar no servidor (Node) e cause falhas de hidratação e quebra de layout de responsividade
const ChartRenderer = dynamic(() => import("@/components/statistics/ChartRenderer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-full items-center justify-center text-[var(--color-muted-foreground)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
      <p>Construindo Gráficos...</p>
    </div>
  )
});

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

const COLORS = [
  "#3b82f6", // Blue
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

  // PARTE 1: Lógica robusta de KPIs
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, todo: 0, inProgress: 0, done: 0 };
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
    };
  }, [tasks]);

  const chartData = useMemo(() => {
    // Filtra e organiza para renderizar no gráfico
    return [
      { name: "A Fazer", value: stats.todo, fill: primaryColor },
      { name: "Em Progresso", value: stats.inProgress, fill: primaryColor },
      { name: "Concluídas", value: stats.done, fill: primaryColor }
    ];
  }, [stats, primaryColor]);

  // Handle errors
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--red)]">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p>Não foi possível carregar os dados estatísticos. Tente recarregar a página.</p>
      </div>
    );
  }

  // Handle loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Estatísticas</h1>
          <p className="text-[var(--text-2)] text-sm mt-1">Acompanhe seu progresso e a distribuição das suas tarefas em tempo real.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 hover:border-[var(--accent)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Total de Tarefas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 hover:border-[var(--text-3)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[var(--text-3)]/10 text-[var(--text-3)] flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">A Fazer</p>
            <p className="text-2xl font-bold">{stats.todo}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 hover:border-[var(--yellow)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[var(--yellow)]/10 text-[var(--yellow)] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Em Progresso</p>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 hover:border-[var(--green)] transition-colors">
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
      <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex-1 flex flex-col min-h-[500px]">
        
        {/* PARTE 2: Controles Customizáveis */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Distribuição por Status</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            
            {/* Seletor de Cores */}
            <div className="flex items-center gap-2 bg-[var(--bg-3)] p-2 rounded-full border border-[var(--color-border)] shadow-inner">
              <span className="text-[10px] font-bold text-[var(--color-muted-foreground)] ml-2 mr-1 uppercase tracking-wider">Cores</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimaryColor(c)}
                  className={clsx(
                    "w-6 h-6 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shadow-sm",
                    primaryColor === c ? "scale-125 ring-2 ring-offset-2 ring-offset-[var(--bg-3)] ring-[var(--accent)]" : "hover:scale-110 opacity-60 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c }}
                  title={`Mudar para cor ${c}`}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>

            {/* Seletor de Tipos de Gráficos */}
            <div className="relative w-full sm:w-auto">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="w-full sm:w-auto appearance-none bg-[var(--bg)] border border-[var(--color-border)] font-medium text-sm rounded-[var(--radius)] px-4 py-2.5 pr-10 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-sm cursor-pointer hover:border-[var(--color-muted-foreground)] transition-colors"
              >
                <option value="bar">Gráfico de Colunas/Barras</option>
                <option value="line">Gráfico de Linhas</option>
                <option value="pie">Gráfico de Pizza (Setores)</option>
                <option value="area">Gráfico de Área</option>
                <option value="scatter">Gráfico de Dispersão</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-muted-foreground)]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

          </div>
        </div>

        {/* PARTE 3: Integração Segura do Recharts (Dynamic Render) */}
        <div className="flex-1 w-full h-[400px]">
          <ChartRenderer type={chartType} data={chartData} color={primaryColor} />
        </div>
        
      </div>
    </div>
  );
}
