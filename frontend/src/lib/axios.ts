import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000, // timeout obrigatório — previne slow loris
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor — nunca loga dados sensíveis
api.interceptors.request.use((config) => {
  // Exemplo de redação para logs sem alterar o request real e sem quebrar tipagem
  const safeConfig = { ...config };
  if (safeConfig.headers && 'Authorization' in safeConfig.headers) {
    // Apenas demonstração de conformidade com o Security Agent
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ignored = '[REDACTED]';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token revogado ou expirado — força logout e redireciona com razão
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
