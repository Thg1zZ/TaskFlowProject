import api from "@/lib/axios";

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface CategoryInput {
  name: string;
  color: string;
  icon: string;
}

export const categoriesApi = {
  getAll: async (url: string) => {
    const res = await api.get<Category[]>(url);
    return res.data;
  },

  create: async (data: CategoryInput) => {
    const res = await api.post<Category>("/categories", data);
    return res.data;
  },

  update: async (id: number, data: CategoryInput) => {
    const res = await api.put<Category>(`/categories/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/categories/${id}`);
  },
};
