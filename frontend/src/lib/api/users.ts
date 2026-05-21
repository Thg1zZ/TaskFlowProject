import api from "@/lib/axios";

export const usersApi = {
  getProfile: async () => {
    const res = await api.get("/users/me");
    return res.data;
  },

  updateProfile: async (data: { name: string; email: string; bio?: string; jobTitle?: string }) => {
    const response = await api.put("/users/me", data);
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  changePassword: async (data: { currentPassword?: string; newPassword?: string }) => {
    const res = await api.patch("/users/me/password", data);
    return res.data;
  }
};
