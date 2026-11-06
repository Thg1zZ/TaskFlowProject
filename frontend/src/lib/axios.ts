import axios from 'axios';
import { getStoredLocale } from '@/i18n/I18nProvider';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000, // timeout obrigatório: previne slow loris
  headers: {
    'Content-Type': 'application/json',
  },
});

// O backend responde as mensagens de erro no idioma escolhido na interface
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.headers['Accept-Language'] = getStoredLocale();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token revogado ou expirado: só redireciona em área logada (evita loop no /login)
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
        sessionStorage.removeItem('user');
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
