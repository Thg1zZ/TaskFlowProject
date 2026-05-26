import api from '../axios';

export interface Notification {
  id: number;
  type: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: async () => {
    const response = await api.get<Notification[]>('/notifications');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<number>('/notifications/unread-count');
    return response.data;
  },

  markAllAsRead: async () => {
    await api.patch('/notifications/read-all');
  },

  markAsRead: async (id: number) => {
    await api.patch(`/notifications/${id}/read`);
  }
};
