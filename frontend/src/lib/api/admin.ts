import api from "@/lib/axios";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "ROLE_ADMIN" | "ROLE_USER" | "ROLE_SUPER_ADMIN";
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

/** Registro individual de auditoria — reflete AdminAuditLog.java */
export interface AuditLog {
  id: number;
  adminId: number;
  adminEmail: string;
  adminRole: string;
  targetUserId: number | null;
  targetUserEmail: string | null;
  action: string;
  details: string | null;
  result: "SUCCESS" | "BLOCKED" | "FAILED";
  ipHash: string | null;
  performedAt: string; // ISO-8601
}

/** Página retornada pelo Spring Data Page<AdminAuditLog> */
export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number; // página atual (0-indexed)
  size: number;
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

  changeUserRole: async (
    id: number,
    role: "ROLE_ADMIN" | "ROLE_USER" | "ROLE_SUPER_ADMIN"
  ): Promise<AdminUser> => {
    const res = await api.patch<AdminUser>(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  /**
   * Retorna o log de auditoria paginado (50 entradas por página).
   * Apenas ADMIN e SUPER_ADMIN têm acesso — validado no backend.
   */
  getAuditLogs: async (page = 0): Promise<AuditLogPage> => {
    const res = await api.get<AuditLogPage>("/admin/audit-logs", { params: { page } });
    return res.data;
  },
};
