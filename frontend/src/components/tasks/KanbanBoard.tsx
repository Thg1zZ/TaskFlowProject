"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "@/lib/api/tasks";
import TaskCard from "./TaskCard";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onTaskClick: (task: Task) => void;
  isLoading?: boolean;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "TODO", title: "A Fazer", color: "border-[var(--color-border)]" },
  { id: "IN_PROGRESS", title: "Em Progresso", color: "border-[var(--yellow)]" },
  { id: "DONE", title: "Concluída", color: "border-[var(--green)]" },
];

export default function KanbanBoard({ tasks, onTaskMove, onTaskClick, isLoading }: KanbanBoardProps) {
  // Use local state for optimistic UI updates during drag
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  // Fix hydration issues with dnd
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setLocalTasks(tasks);
    setIsBrowser(true);
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a column
    if (!destination) return;

    // Dropped in the exact same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const taskId = Number(draggableId);
    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic Update
    const updatedTasks = localTasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setLocalTasks(updatedTasks);

    try {
      // Call parent handler which should call the API
      await onTaskMove(taskId, newStatus);
    } catch (error) {
      // Revert on failure
      setLocalTasks(tasks);
    }
  };

  if (!isBrowser) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnTasks = localTasks.filter((t) => t.status === col.id);

          return (
            <div key={col.id} className="flex flex-col w-80 shrink-0">
              {/* Column Header */}
              <div className={clsx("flex items-center justify-between mb-4 pb-2 border-b-2", col.color)}>
                <h3 className="font-semibold text-[var(--text)]">{col.title}</h3>
                <span className="bg-[var(--bg-3)] text-[var(--text-2)] text-xs py-0.5 px-2 rounded-full font-medium">
                  {columnTasks.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "flex-1 bg-[var(--bg-2)]/50 rounded-[var(--radius-lg)] p-2 min-h-[150px] transition-colors",
                      snapshot.isDraggingOver && "bg-[var(--bg-3)]"
                    )}
                  >
                    {isLoading && columnTasks.length === 0 ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-muted-foreground)]" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                              >
                                <TaskCard
                                  task={task}
                                  onClick={() => onTaskClick(task)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
