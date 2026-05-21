"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { AlertCircle, Loader2, CheckSquare } from "lucide-react";

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks");
      const tasks = res.data;
      
      const calcStats = {
        total: tasks.length,
        todo: tasks.filter((t: any) => t.status === "TODO").length,
        inProgress: tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
        done: tasks.filter((t: any) => t.status === "DONE").length,
        overdue: tasks.filter((t: any) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date()).length
      };
      
      setStats(calcStats);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 rounded-[var(--radius)] flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-[var(--color-muted-foreground)]">Acompanhe o progresso das suas atividades.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer hover:border-[var(--accent)] transition-colors">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Total de Tarefas</p>
          <p className="text-3xl font-bold">{stats?.total || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--accent)] h-full w-full" />
          </div>
        </div>

        {/* TODO Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer hover:border-[var(--color-border)] transition-colors">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">A Fazer</p>
          <p className="text-3xl font-bold">{stats?.todo || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--text-3)] h-full transition-all" style={{ width: `${stats?.total ? (stats.todo / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* In Progress Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer hover:border-[var(--yellow)]/50 transition-colors">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Em Progresso</p>
          <p className="text-3xl font-bold">{stats?.inProgress || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--yellow)] h-full transition-all" style={{ width: `${stats?.total ? (stats.inProgress / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Done Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer hover:border-[var(--green)]/50 transition-colors">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Concluídas</p>
          <p className="text-3xl font-bold">{stats?.done || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--green)] h-full transition-all" style={{ width: `${stats?.total ? (stats.done / stats.total) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
      
      {/* Vencidas Card (if any) */}
      {stats && stats.overdue > 0 && (
        <div className="p-4 bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-[var(--radius)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--red)]" />
            <div>
              <p className="font-medium text-[var(--red)]">Atenção</p>
              <p className="text-sm text-[var(--red)]/80">Você possui {stats.overdue} tarefa(s) atrasada(s).</p>
            </div>
          </div>
          <button className="text-sm font-medium text-[var(--red)] hover:underline">
            Ver tarefas
          </button>
        </div>
      )}

      {/* Main Content Area Placeholder */}
      <div className="glass rounded-[var(--radius-lg)] p-6 min-h-[400px] border-dashed">
        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-[var(--color-muted-foreground)]">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-3)] flex items-center justify-center mb-2">
            <CheckSquare className="w-6 h-6" />
          </div>
          <p className="font-medium text-[var(--text)]">Área de Tarefas em Breve</p>
          <p className="text-sm max-w-sm">A lista de tarefas (lista/grid) será integrada aqui conectando aos endpoints REST correspondentes.</p>
        </div>
      </div>
    </div>
  );
}
