import api from "@/lib/axios";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "ROLE_ADMIN" | "ROLE_USER";
  bio: string | null;
  jobTitle: string | null;
  createdAt: string;
  taskCount: number;
  accessCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalAccesses: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  accessesLast7Days: number;
  accessesLast30Days: number;
}

export const adminApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>("/admin/users");
    return res.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>("/admin/stats");
    return res.data;
  },

  changeUserEmail: async (id: number, email: string): Promise<AdminUser> => {
    const res = await api.patch<AdminUser>(`/admin/users/${id}/email`, { email });
    return res.data;
  },

  changeUserRole: async (id: number, role: "ROLE_ADMIN" | "ROLE_USER"): Promise<AdminUser> => {
    const res = await api.patch<AdminUser>(`/admin/users/${id}/role`, { role });
    return res.data;
  },
};
