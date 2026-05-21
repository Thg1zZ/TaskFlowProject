import api from "@/lib/axios";

export const usersApi = {
  getProfile: async () => {
    const res = await api.get("/users/me");
    return res.data;
  },

  updateProfile: async (data: { name: string; email: string }) => {
    const res = await api.put("/users/me", data);
    return res.data;
  },

  changePassword: async (data: { currentPassword?: string; newPassword?: string }) => {
    const res = await api.patch("/users/me/password", data);
    return res.data;
  }
};
