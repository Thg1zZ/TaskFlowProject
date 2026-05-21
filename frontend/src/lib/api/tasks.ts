import api from "@/lib/axios";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  estimatedMinutes: number | null;
  timeSpentMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  commentCount: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  categoryId?: number | null;
  estimatedMinutes?: number | null;
}

export const tasksApi = {
  // Fetcher for SWR
  getAll: async (url: string) => {
    const res = await api.get<Task[]>(url);
    return res.data;
  },

  create: async (data: TaskInput) => {
    const res = await api.post<Task>("/tasks", data);
    return res.data;
  },

  update: async (id: number, data: TaskInput) => {
    const res = await api.put<Task>(`/tasks/${id}`, data);
    return res.data;
  },

  updateStatus: async (id: number, status: TaskStatus) => {
    const res = await api.patch<Task>(`/tasks/${id}/status`, { status });
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/tasks/${id}`);
  },
};
