"use client";

import { useState } from "react";
import useSWR from "swr";
import { tasksApi, Task, TaskStatus } from "@/lib/api/tasks";
import TaskCard from "@/components/tasks/TaskCard";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import TaskModal from "@/components/tasks/TaskModal";
import { LayoutGrid, List, KanbanSquare, Plus, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";

type ViewMode = "grid" | "list" | "kanban";
type FilterStatus = "ALL" | TaskStatus;

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // SWR for automatic fetching, caching, and revalidation
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);

  const filteredTasks = tasks?.filter((t) => filter === "ALL" || t.status === filter) || [];

  const handleCreateNew = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    if (!tasks) return;
    // Optimistic Update
    mutate(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      false
    );
    try {
      await tasksApi.updateStatus(taskId, newStatus);
      mutate();
    } catch {
      mutate(); // revert on error
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 p-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 bg-[var(--bg-2)] p-1 rounded-lg border border-[var(--color-border)]">
          <button
            onClick={() => setFilter("ALL")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              filter === "ALL" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("TODO")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              filter === "TODO" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            A Fazer
          </button>
          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              filter === "IN_PROGRESS" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Em Progresso
          </button>
          <button
            onClick={() => setFilter("DONE")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              filter === "DONE" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Concluídas
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--bg-2)] rounded-lg border border-[var(--color-border)] p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === "grid" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--color-muted-foreground)]"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === "list" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--color-muted-foreground)]"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === "kanban" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--color-muted-foreground)]"
              )}
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {error ? (
          <div className="p-4 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 rounded-[var(--radius-lg)] flex items-center justify-center gap-2 h-32">
            <AlertCircle className="w-5 h-5" />
            <span>Erro ao carregar as tarefas. Tente novamente.</span>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : filteredTasks.length === 0 && viewMode !== "kanban" ? (
          <div className="flex-1 flex flex-col items-center justify-center glass rounded-[var(--radius-lg)] border-dashed border-2">
            <div className="w-16 h-16 bg-[var(--bg-3)] rounded-full flex items-center justify-center mb-4 text-[var(--text-3)]">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
            <p className="text-[var(--text-2)] text-sm mb-4">Crie sua primeira tarefa para começar.</p>
            <button onClick={handleCreateNew} className="text-[var(--accent)] hover:underline text-sm font-medium">
              + Criar Tarefa
            </button>
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard 
            tasks={tasks || []} 
            onTaskMove={handleStatusChange} 
            onTaskClick={handleEdit} 
            isLoading={isLoading} 
          />
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            <div className={clsx(
              "gap-4 pb-4",
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max" : "flex flex-col space-y-3"
            )}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleEdit(task)}
                  onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Modal for Create/Edit */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
