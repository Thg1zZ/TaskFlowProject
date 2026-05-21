"use client";

import { useState } from "react";
import useSWR from "swr";
import { tasksApi, Task } from "@/lib/api/tasks";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import TaskModal from "@/components/tasks/TaskModal";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--bg)]/50 backdrop-blur-sm z-10 sticky top-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="text-[var(--text-2)] text-sm">Visão geral de vencimentos.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[var(--bg-2)] p-1 rounded-lg border border-[var(--color-border)]">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-[var(--bg)] rounded-md transition-colors text-[var(--text-2)] hover:text-[var(--text)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm font-medium hover:bg-[var(--bg)] rounded-md transition-colors"
          >
            Hoje
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-[var(--bg)] rounded-md transition-colors text-[var(--text-2)] hover:text-[var(--text)]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="flex-1 overflow-hidden flex flex-col p-6 bg-[var(--bg)]">
        {error ? (
          <div className="p-4 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 rounded-[var(--radius-lg)] flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Erro ao carregar as tarefas.</span>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden glass shadow-sm">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--bg-2)]">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="py-3 text-center text-sm font-semibold text-[var(--text-2)]">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
              {days.map((day, i) => {
                const dayTasks = tasks?.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day)) || [];

                return (
                  <div 
                    key={day.toISOString()}
                    className={clsx(
                      "min-h-[100px] border-r border-b border-[var(--color-border)]/50 p-2 transition-colors",
                      !isSameMonth(day, monthStart) && "bg-[var(--bg-2)]/30 opacity-60",
                      isToday(day) && "bg-[var(--accent)]/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                        isToday(day) ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text)]"
                      )}>
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[80%] pr-1 custom-scrollbar">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={clsx(
                            "text-[11px] font-medium px-2 py-1 rounded truncate cursor-pointer transition-all hover:opacity-80 border",
                            task.status === "DONE" 
                              ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20 line-through" 
                              : "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20"
                          )}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
