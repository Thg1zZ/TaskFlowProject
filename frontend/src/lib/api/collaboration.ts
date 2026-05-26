import api from '../axios';

export interface TaskParticipant {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
}

export interface ShareLink {
  id: number;
  token: string;
  roleGranted: 'ADMIN' | 'EDITOR' | 'VIEWER';
  expiresAt: string | null;
  isActive: boolean;
}

export const collaborationApi = {
  // Gera um novo link
  generateShareLink: async (taskId: number, role: string = 'VIEWER', expireHours?: number) => {
    const params = new URLSearchParams({ role });
    if (expireHours) params.append('expireHours', expireHours.toString());
    
    const response = await api.post<ShareLink>(`/tasks/${taskId}/share?${params.toString()}`);
    return response.data;
  },

  // Entra em uma tarefa via token
  joinTask: async (token: string) => {
    const response = await api.post<TaskParticipant>(`/tasks/join/${token}`);
    return response.data;
  },

  // Lista participantes
  getParticipants: async (taskId: number) => {
    const response = await api.get<TaskParticipant[]>(`/tasks/${taskId}/participants`);
    return response.data;
  },

  // Remove participante
  removeParticipant: async (taskId: number, userId: number) => {
    await api.delete(`/tasks/${taskId}/participants/${userId}`);
  },

  // Atualiza privacidade
  updatePrivacy: async (taskId: number, privacy: 'PRIVATE' | 'PUBLIC') => {
    await api.patch(`/tasks/${taskId}/privacy?privacy=${privacy}`);
  }
};
