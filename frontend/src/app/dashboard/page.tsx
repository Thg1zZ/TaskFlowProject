"use client";

import { useState } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import TaskModal from "@/components/tasks/TaskModal";
import { AlertCircle, Loader2, CheckSquare, Settings } from "lucide-react";
import PomodoroTimer from "@/components/pomodoro/PomodoroTimer";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ColorSettingsModal, { defaultColors } from "@/components/dashboard/ColorSettingsModal";
import ParticipantAvatars from "@/components/collaboration/ParticipantAvatars";
import { isPast, isToday } from "date-fns";
import clsx from "clsx";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  let colors = defaultColors;
  if (user?.themePreferences) {
    try {
      colors = { ...defaultColors, ...JSON.parse(user.themePreferences) };
    } catch (e) {}
  }

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

  const getStatusBadgeStyle = (status: "TODO" | "IN_PROGRESS", color: string) => {
    if (color.startsWith("var(")) {
      if (status === "TODO") {
        return {
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          color: color,
          border: "1px solid rgba(156, 163, 175, 0.2)"
        };
      } else {
        return {
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          color: color,
          border: "1px solid rgba(245, 158, 11, 0.2)"
        };
      }
    } else {
      return {
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      };
    }
  };

  const parseLocalCalendarDate = (dateStr: string): Date => {
    const parts = dateStr.split("T")[0].split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-[var(--color-muted-foreground)]">Acompanhe o progresso das suas atividades.</p>
        </div>
        <button 
          onClick={() => setIsColorModalOpen(true)}
          className="p-2 rounded-full hover:bg-[var(--bg-3)] text-[var(--color-muted-foreground)] transition-colors"
          title="Personalizar Cores"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer transition-colors" onMouseOver={e => e.currentTarget.style.borderColor = colors.total} onMouseOut={e => e.currentTarget.style.borderColor = ''}>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Total de Tarefas</p>
          <p className="text-3xl font-bold">{stats?.total || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="h-full w-full" style={{ backgroundColor: colors.total }} />
          </div>
        </div>

        {/* TODO Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer transition-colors" onMouseOver={e => e.currentTarget.style.borderColor = colors.todo} onMouseOut={e => e.currentTarget.style.borderColor = ''}>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">A Fazer</p>
          <p className="text-3xl font-bold">{stats?.todo || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="h-full transition-all" style={{ backgroundColor: colors.todo, width: `${stats?.total ? (stats.todo / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* In Progress Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer transition-colors" onMouseOver={e => e.currentTarget.style.borderColor = colors.inProgress} onMouseOut={e => e.currentTarget.style.borderColor = ''}>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Em Progresso</p>
          <p className="text-3xl font-bold">{stats?.inProgress || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="h-full transition-all" style={{ backgroundColor: colors.inProgress, width: `${stats?.total ? (stats.inProgress / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Done Card */}
        <div className="glass p-5 rounded-[var(--radius-lg)] space-y-3 cursor-pointer transition-colors" onMouseOver={e => e.currentTarget.style.borderColor = colors.done} onMouseOut={e => e.currentTarget.style.borderColor = ''}>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Concluídas</p>
          <p className="text-3xl font-bold">{stats?.done || 0}</p>
          <div className="w-full bg-[var(--bg-3)] h-1.5 rounded-full overflow-hidden">
            <div className="h-full transition-all" style={{ backgroundColor: colors.done, width: `${stats?.total ? (stats.done / stats.total) * 100 : 0}%` }} />
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
              {recentTasks.map((task) => {
                const endDateStr = task.endDate || task.dueDate;
                const parsedDate = endDateStr ? parseLocalCalendarDate(endDateStr) : null;
                const isOverdue = parsedDate && task.status !== "DONE" && isPast(parsedDate) && !isToday(parsedDate);

                return (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task)}
                    className={clsx(
                      "p-4 rounded-[var(--radius)] bg-[var(--bg)] border hover:border-[var(--accent)] transition-colors flex items-center gap-4 cursor-pointer group w-full",
                      isOverdue ? "border-[var(--red)]/30 bg-[var(--red)]/5" : "border-[var(--color-border)]"
                    )}
                  >
                    <div 
                      className={clsx(
                        "w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300",
                        isOverdue ? "bg-[var(--red)] animate-[pulse_2.5s_infinite_ease-in-out] shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""
                      )}
                      style={!isOverdue ? { backgroundColor: task.status === 'TODO' ? colors.todo : colors.inProgress } : undefined}
                    />
                  
                  <p className="font-medium text-[var(--text)] text-sm w-32 sm:w-48 truncate flex-shrink-0">
                    {task.title}
                  </p>
                  
                  <div className="flex-1 min-w-0 hidden md:block text-xs text-[var(--color-muted-foreground)] truncate">
                    {task.description || "Sem descrição"}
                  </div>

                  <div className="flex items-center justify-end gap-3 flex-shrink-0 ml-auto">
                    {task.participants && task.participants.length > 0 && (
                      <div className="hidden sm:block">
                        <ParticipantAvatars participants={task.participants as any} />
                      </div>
                    )}
                    <span 
                    className="text-xs font-medium px-2 py-1 rounded flex-shrink-0 whitespace-nowrap text-center w-24"
                    style={getStatusBadgeStyle(task.status as any, task.status === 'TODO' ? colors.todo : colors.inProgress)}
                  >
                    {task.status === "TODO" ? "A Fazer" : "Em Progresso"}
                  </span>
                  </div>
                </div>
              );
            })}
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

      <ColorSettingsModal 
        isOpen={isColorModalOpen} 
        onClose={() => setIsColorModalOpen(false)} 
      />
    </div>
  );
}
