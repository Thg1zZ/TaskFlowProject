import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { EventSourcePolyfill } from 'event-source-polyfill';

export const useRealtime = () => {
  const { mutate } = useSWRConfig();
  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);

  useEffect(() => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    
    // Como a API usa httpOnly cookies (ou JWT), o polyfill com withCredentials envia os cookies/sessões
    const source = new EventSourcePolyfill(`${baseURL}/stream`, {
      withCredentials: true
    });

    source.addEventListener('TASK_UPDATED', (e: any) => {
      mutate('/tasks');
    });

    source.addEventListener('TASK_DELETED', (e: any) => {
      mutate('/tasks');
      toast.success("Uma tarefa foi excluída.");
    });

    source.addEventListener('USER_JOINED_TASK', (e: any) => {
      mutate('/tasks');
      toast.success(e.data);
    });

    source.addEventListener('USER_LEFT_TASK', (e: any) => {
      mutate('/tasks');
    });

    source.addEventListener('NEW_NOTIFICATION', (e: any) => {
      mutate('/notifications/unread-count');
      mutate('/notifications');
      try {
        const notif = JSON.parse(e.data);
        toast(notif.message, { icon: '🔔' });
      } catch(err) {}
    });

    eventSourceRef.current = source;

    source.onerror = (e) => {
      console.error('SSE Error:', e);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [mutate]);
};
