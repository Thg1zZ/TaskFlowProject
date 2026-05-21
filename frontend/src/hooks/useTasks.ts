import useSWR from "swr";
import { tasksApi, Task, TaskStatus } from "@/lib/api/tasks";

export function useTasks(filter: "ALL" | TaskStatus = "ALL") {
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);

  const filteredTasks = tasks?.filter((t) => filter === "ALL" || t.status === filter) || [];

  const updateTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    if (!tasks) return;
    
    // Optimistic Update
    mutate(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      false
    );
    
    try {
      await tasksApi.updateStatus(taskId, newStatus);
      // Revalidar com os dados re-buscados
      mutate();
    } catch {
      // Reverte em caso de erro
      mutate();
    }
  };

  const revalidate = () => mutate();

  return {
    tasks,
    filteredTasks,
    error,
    isLoading,
    updateTaskStatus,
    revalidate
  };
}
