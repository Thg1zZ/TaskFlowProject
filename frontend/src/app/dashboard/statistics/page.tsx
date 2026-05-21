"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import { Loader2, PieChart as PieIcon, LayoutDashboard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const ChartRenderer = dynamic(() => import("@/components/statistics/ChartRenderer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-full items-center justify-center text-[var(--color-muted-foreground)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
      <p>Construindo Gráficos...</p>
    </div>
  )
});

type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "histogram";

export default function StatisticsPage() {
  const { data: tasks, error, isLoading } = useSWR<Task[]>("/tasks", tasksApi.getAll);
  
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [barHorizontal, setBarHorizontal] = useState(false);
  const [colorTodo, setColorTodo] = useState("#f59e0b");
  const [colorProgress, setColorProgress] = useState("#3b82f6");
  const [colorDone, setColorDone] = useState("#22d3a5");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedType = localStorage.getItem("profileChartType") as ChartType | null;
    const savedBarH = localStorage.getItem("profileChartBarH");
    const savedColorTodo = localStorage.getItem("profileColorTodo");
    const savedColorProgress = localStorage.getItem("profileColorProgress");
    const savedColorDone = localStorage.getItem("profileColorDone");

    if (savedType) setChartType(savedType);
    if (savedBarH) setBarHorizontal(savedBarH === "1");
    if (savedColorTodo) setColorTodo(savedColorTodo);
    if (savedColorProgress) setColorProgress(savedColorProgress);
    if (savedColorDone) setColorDone(savedColorDone);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("profileChartType", chartType);
      localStorage.setItem("profileChartBarH", barHorizontal ? "1" : "0");
      localStorage.setItem("profileColorTodo", colorTodo);
      localStorage.setItem("profileColorProgress", colorProgress);
      localStorage.setItem("profileColorDone", colorDone);
    }
  }, [chartType, barHorizontal, colorTodo, colorProgress, colorDone, isMounted]);

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
    return [
      { name: "A Fazer", value: stats.todo, fill: colorTodo },
      { name: "Em Progresso", value: stats.inProgress, fill: colorProgress },
      { name: "Concluídas", value: stats.done, fill: colorDone }
    ];
  }, [stats, colorTodo, colorProgress, colorDone]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--red)]">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p>Não foi possível carregar os dados estatísticos. Tente recarregar a página.</p>
      </div>
    );
  }

  if (isLoading || !isMounted) {
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
          <p className="text-[var(--text-2)] text-sm mt-1">Distribuição das suas tarefas por status — personalize o tipo de gráfico e as cores.</p>
        </div>
      </div>

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

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colorTodo}1A`, color: colorTodo }}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">A Fazer</p>
            <p className="text-2xl font-bold" style={{ color: colorTodo }}>{stats.todo}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colorProgress}1A`, color: colorProgress }}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Em Progresso</p>
            <p className="text-2xl font-bold" style={{ color: colorProgress }}>{stats.inProgress}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colorDone}1A`, color: colorDone }}>
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Concluídas</p>
            <p className="text-2xl font-bold" style={{ color: colorDone }}>{stats.done}</p>
          </div>
        </div>
      </div>

      <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex-1 flex flex-col min-h-[500px]">
        
        <div className="flex flex-col mb-6 gap-6 border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Hub de estatísticas</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end w-full">
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider" htmlFor="chartTypeSelect">
                  Tipo de visualização
                </label>
                <div className="relative w-full sm:w-auto">
                  <select
                    id="chartTypeSelect"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="w-full sm:w-auto appearance-none bg-[var(--bg)] border border-[var(--color-border)] font-medium text-sm rounded-[var(--radius)] px-4 py-2 pr-10 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-sm cursor-pointer hover:border-[var(--color-muted-foreground)] transition-colors"
                  >
                    <option value="pie">Gráfico de setores (Doughnut)</option>
                    <option value="bar">Gráfico de colunas / barras</option>
                    <option value="line">Gráfico de linhas</option>
                    <option value="area">Gráfico de área</option>
                    <option value="scatter">Gráfico de dispersão</option>
                    <option value="histogram">Histograma</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-muted-foreground)]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {(chartType === 'bar' || chartType === 'histogram') && (
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] transition-colors pb-2 sm:pb-0 h-[38px] mt-0 sm:mt-5">
                  <input 
                    type="checkbox" 
                    checked={barHorizontal} 
                    onChange={(e) => setBarHorizontal(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-[var(--bg)] bg-[var(--bg-2)] cursor-pointer"
                  />
                  <span>Barras horizontais</span>
                </label>
              )}
            </div>

            <div className="flex-1"></div>

            <div className="flex flex-col gap-1 w-full md:w-auto">
              <span className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-1">Cores por status</span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-medium text-[var(--text-2)] group-hover:text-[var(--text)] transition-colors">A Fazer</span>
                  <input type="color" value={colorTodo} onChange={(e) => setColorTodo(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" title="A Fazer" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-medium text-[var(--text-2)] group-hover:text-[var(--text)] transition-colors">Em progresso</span>
                  <input type="color" value={colorProgress} onChange={(e) => setColorProgress(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" title="Em progresso" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-medium text-[var(--text-2)] group-hover:text-[var(--text)] transition-colors">Concluídas</span>
                  <input type="color" value={colorDone} onChange={(e) => setColorDone(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" title="Concluídas" />
                </label>
              </div>
            </div>

          </div>
        </div>

        <div className="w-full h-[400px] relative" style={{ minHeight: "400px" }}>
          <ChartRenderer type={chartType} data={chartData} barHorizontal={barHorizontal} />
        </div>
        
      </div>
    </div>
  );
}
