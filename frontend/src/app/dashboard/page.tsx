"use client";

import { useState } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import TaskModal from "@/components/tasks/TaskModal";
import { AlertCircle, Loader2, CheckSquare } from "lucide-react";
import PomodoroTimer from "@/components/pomodoro/PomodoroTimer";
import Link from "next/link";


export default function DashboardPage() {
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const stats = tasks ? {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    overdue: tasks.filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date()).length
  } : null;

  const recentTasks = tasks ? tasks.filter((t) => t.status !== "DONE").slice(0, 5) : [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 rounded-[var(--radius)] flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Erro ao carregar os dados do painel.
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
          <Link href="/dashboard/tasks" className="text-sm font-medium text-[var(--red)] hover:underline">
            Ver tarefas
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tarefas Recentes */}
        <div className="lg:col-span-2 glass rounded-[var(--radius-lg)] p-6 min-h-[400px] border border-[var(--color-border)] shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text)]">Tarefas Recentes</h2>
          
          {recentTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-[var(--color-muted-foreground)]">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-3)] flex items-center justify-center mb-2">
                <CheckSquare className="w-6 h-6" />
              </div>
              <p className="font-medium text-[var(--text)]">Tudo em dia!</p>
              <p className="text-sm max-w-sm">Você não possui tarefas pendentes no momento.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2">
              {recentTasks.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskClick(task)}
                  className="p-4 rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--color-border)] hover:border-[var(--accent)] transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${task.priority === 'HIGH' ? 'bg-[var(--red)]' : task.priority === 'MEDIUM' ? 'bg-[var(--yellow)]' : 'bg-[var(--blue)]'}`} />
                    <div>
                      <p className="font-medium text-[var(--text)] text-sm">{task.title}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-1">{task.description || "Sem descrição"}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--bg-3)] text-[var(--text-2)]">
                    {task.status === "TODO" ? "A Fazer" : "Em Progresso"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pomodoro Timer */}
        <div className="lg:col-span-1">
          <PomodoroTimer />
        </div>
      </div>

      {/* Task Modal for details / edit */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
