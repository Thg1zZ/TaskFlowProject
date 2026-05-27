import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { EventSourcePolyfill } from 'event-source-polyfill';

export const useRealtime = () => {
  const { mutate } = useSWRConfig();
  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);

  useEffect(() => {
    // Como a API usa httpOnly cookies (ou JWT), o polyfill com com caminho relativo '/api' passa pelo rewrite do Next.js, permitindo o envio automático de cookies de mesmo domínio.
    const source = new EventSourcePolyfill('/api/stream', {
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
