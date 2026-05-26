"use client";

import { Task } from "@/lib/api/tasks";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, CheckSquare, MessageSquare, AlertTriangle, Play, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: Task["status"]) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

const priorityColors = {
  HIGH: "bg-[var(--red)]",
  MEDIUM: "bg-[var(--yellow)]",
  LOW: "bg-[var(--green)]",
};

const statusConfig = {
  TODO: { label: "A Fazer", icon: CheckSquare, color: "text-[var(--text-3)]" },
  IN_PROGRESS: { label: "Em Progresso", icon: Play, color: "text-[var(--yellow)]" },
  DONE: { label: "Concluída", icon: CheckCircle2, color: "text-[var(--green)]" },
};

export default function TaskCard({ task, onClick, onStatusChange, selected, onSelect }: TaskCardProps) {
  const endDateStr = task.endDate || task.dueDate;
  const isOverdue = endDateStr && task.status !== "DONE" && isPast(new Date(endDateStr)) && !isToday(new Date(endDateStr));
  
  const StatusIcon = statusConfig[task.status].icon;

  return (
    <div 
      onClick={onClick}
      className={clsx(
        "group relative flex flex-col glass rounded-[var(--radius-lg)] shadow-sm hover:shadow-md transition-all cursor-pointer border border-[var(--color-border)] overflow-hidden",
        selected && "border-[var(--accent)] ring-1 ring-[var(--accent)]"
      )}
    >
      {/* Priority Bar */}
      <div 
        className={clsx(
          "absolute top-0 left-0 bottom-0 w-1.5 transition-all duration-300",
          isOverdue 
            ? "bg-[var(--red)] animate-[pulse_1.5s_infinite_ease-in-out] shadow-[2px_0_12px_rgba(239,68,68,0.8)] z-10" 
            : priorityColors[task.priority]
        )} 
      />

      <div className="p-4 pl-5 flex flex-col h-full gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            {onSelect && (
              <div 
                className="mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  type="checkbox" 
                  checked={selected}
                  onChange={(e) => onSelect(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
              </div>
            )}
            <div>
              <h3 className={clsx(
                "font-medium leading-tight",
                task.status === "DONE" ? "text-[var(--text-3)] line-through" : "text-[var(--text)]"
              )}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-[var(--text-3)] line-clamp-1 mt-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Status Dropdown (Stop Propagation) */}
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={task.status}
              onChange={(e) => onStatusChange?.(e.target.value as Task["status"])}
              className={clsx(
                "text-xs font-medium py-1 px-2 rounded-full border bg-transparent cursor-pointer appearance-none outline-none",
                task.status === "TODO" && "border-[var(--color-border)] text-[var(--text-2)] hover:bg-[var(--bg-3)]",
                task.status === "IN_PROGRESS" && "border-[var(--yellow)]/30 text-[var(--yellow)] hover:bg-[var(--yellow)]/10",
                task.status === "DONE" && "border-[var(--green)]/30 text-[var(--green)] hover:bg-[var(--green)]/10"
              )}
            >
              <option value="TODO">○ A Fazer</option>
              <option value="IN_PROGRESS">◑ Progresso</option>
              <option value="DONE">● Concluída</option>
            </select>
          </div>
        </div>

        {/* Badges Area */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {/* Category */}
          {task.categoryName && (
            <span 
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${task.categoryColor || '#71717a'}15`,
                color: task.categoryColor || '#71717a',
                borderColor: `${task.categoryColor || '#71717a'}30`
              }}
            >
              {task.categoryIcon && <span>{task.categoryIcon}</span>}
              {task.categoryName}
            </span>
          )}

          {/* Date */}
          {endDateStr && (
            <span className={clsx(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              isOverdue ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-[var(--bg-3)] text-[var(--text-2)]"
            )}>
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              {format(new Date(endDateStr), "dd MMM", { locale: ptBR })}
            </span>
          )}

          {/* Estimate */}
          {task.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
              <Clock className="w-3 h-3" />
              {task.estimatedMinutes}m
            </span>
          )}

          {/* Comments */}
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
              <MessageSquare className="w-3 h-3" />
              {task.commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
