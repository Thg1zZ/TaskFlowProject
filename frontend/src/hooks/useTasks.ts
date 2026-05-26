import useSWR from "swr";
import { tasksApi, Task, TaskStatus } from "@/lib/api/tasks";

export function useTasks(filter: "ALL" | TaskStatus = "ALL") {
  const { data: tasks, error, isLoading, mutate } = useSWR<Task[]>("/tasks", tasksApi.getAll);

  const filteredTasks = tasks?.filter((t) => filter === "ALL" || t.status === filter) || [];

  const updateTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    if (!tasks) return;
    
    // Toca som de conclusão se o status mudar para DONE (Concluída)
    if (newStatus === "DONE") {
      try {
        const audio = new Audio("/pop.ogg");
        audio.volume = 0.4;
        audio.play().catch((e) => console.log("Autoplay bloqueado pelo navegador:", e));
      } catch (e) {
        console.error("Falha ao tocar áudio:", e);
      }
    }

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
