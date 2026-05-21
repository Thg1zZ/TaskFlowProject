import api from "@/lib/axios";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  provider: string | null;
  createdAt: string;
}

export const adminApi = {
  getUsers: async () => {
    const res = await api.get<AdminUser[]>("/admin/users");
    return res.data;
  },

  deleteUser: async (id: number) => {
    await api.delete(`/admin/users/${id}`);
  },

  getStats: async () => {
    const res = await api.get<{
      totalUsers: number;
      totalTasks: number;
      tasksByStatus: Record<string, number>;
    }>("/admin/stats");
    return res.data;
  }
};
