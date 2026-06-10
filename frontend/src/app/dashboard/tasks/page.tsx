"use client";

import { useState } from "react";
import { Task, TaskStatus } from "@/lib/api/tasks";
import TaskCard from "@/components/tasks/TaskCard";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import TaskModal from "@/components/tasks/TaskModal";
import { LayoutGrid, List, KanbanSquare, Plus, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { useTasks } from "@/hooks/useTasks";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


type ViewMode = "grid" | "list" | "kanban";
type FilterStatus = "ALL" | TaskStatus;

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Lógica delegada para o custom hook (Clean Code)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tasks, filteredTasks, error, isLoading, updateTaskStatus, revalidate } = useTasks(filter);

  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";

  // 1. Filtra as tarefas de acordo com a busca de forma global
  const searchFilteredTasks = (tasks || []).filter((task) => {
    if (!search) return true;
    const query = search.toLowerCase().trim();

    // A. Verifica correspondência básica de texto (título, descrição, categoria)
    const textMatch =
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.categoryName && task.categoryName.toLowerCase().includes(query));

    if (textMatch) return true;

    // B. Verifica correspondência por data de vencimento/conclusão
    const taskDateStr = task.endDate || task.dueDate || task.startDate;
    if (taskDateStr) {
      try {
        // Parse seguro em fuso horário local para evitar retrocesso de data em fusos horários negativos (UTC-3 / Brasil)
        const parts = taskDateStr.split("T")[0].split("-");
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);

        // Gera representações em múltiplos formatos de data usados no Brasil
        const formattedSlashLong = format(dateObj, "dd/MM/yyyy");
        const formattedSlashShort = format(dateObj, "dd/MM");
        const formattedHyphen = format(dateObj, "yyyy-MM-dd");
        const formattedText = format(dateObj, "d 'de' MMMM", { locale: ptBR }).toLowerCase();
        const formattedTextShort = format(dateObj, "dd MMM", { locale: ptBR }).toLowerCase();

        return (
          formattedSlashLong.includes(query) ||
          formattedSlashShort.includes(query) ||
          formattedHyphen.includes(query) ||
          formattedText.includes(query) ||
          formattedTextShort.includes(query)
        );
      } catch (e) {
        console.error("Erro ao analisar data na busca:", e);
      }
    }

    return false;
  });

  // 2. Filtra de acordo com a aba de status selecionada (só para Grid e List)
  const displayedTasks = searchFilteredTasks.filter(
    (t) => filter === "ALL" || t.status === filter
  );

  const handleCreateNew = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-4 sm:-m-6 p-4 sm:p-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 w-full">
        <div className="flex items-center gap-1 bg-[var(--bg-2)] p-1 rounded-lg border border-[var(--color-border)] max-w-full overflow-x-auto scrollbar-none shrink-0 w-full md:w-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all shrink-0 flex-1 md:flex-initial text-center",
              filter === "ALL" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("TODO")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all shrink-0 flex-1 md:flex-initial text-center",
              filter === "TODO" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            A Fazer
          </button>
          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all shrink-0 flex-1 md:flex-initial text-center",
              filter === "IN_PROGRESS" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Em Progresso
          </button>
          <button
            onClick={() => setFilter("DONE")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all shrink-0 flex-1 md:flex-initial text-center",
              filter === "DONE" ? "bg-[var(--bg)] shadow-sm text-[var(--text)]" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            Concluídas
          </button>
        </div>
 
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
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
        ) : displayedTasks.length === 0 && viewMode !== "kanban" ? (
          <div className="flex-1 flex flex-col items-center justify-center glass rounded-[var(--radius-lg)] border-dashed border-2 p-6 text-center">
            <div className="w-16 h-16 bg-[var(--bg-3)] rounded-full flex items-center justify-center mb-4 text-[var(--text-3)]">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium">
              {search ? "Nenhuma tarefa correspondente" : "Nenhuma tarefa encontrada"}
            </h3>
            <p className="text-[var(--text-2)] text-sm mb-4 max-w-sm">
              {search 
                ? `Não encontramos tarefas que correspondam a "${search}". Tente buscar por outro termo.` 
                : "Crie sua primeira tarefa para começar."}
            </p>
            {!search && (
              <button onClick={handleCreateNew} className="text-[var(--accent)] hover:underline text-sm font-medium">
                + Criar Tarefa
              </button>
            )}
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard 
            tasks={searchFilteredTasks} 
            onTaskMove={updateTaskStatus} 
            onTaskClick={handleEdit} 
            isLoading={isLoading} 
          />
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            <div className={clsx(
              "gap-4 pb-4",
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max" : "flex flex-col space-y-3"
            )}>
              {displayedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleEdit(task)}
                  onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
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
        onSuccess={() => revalidate()}
      />
    </div>
  );
}
