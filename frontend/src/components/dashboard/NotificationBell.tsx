"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import useSWR from 'swr';
import { notificationsApi, Notification } from '@/lib/api/notifications';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount, mutate: mutateCount } = useSWR(
    '/notifications/unread-count', 
    notificationsApi.getUnreadCount,
    { fallbackData: 0 }
  );

  const { data: notifications, mutate: mutateList } = useSWR(
    isOpen ? '/notifications' : null,
    notificationsApi.getNotifications
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    await notificationsApi.markAsRead(id);
    mutateList();
    mutateCount();
  };

  const handleMarkAllAsRead = async () => {
    await notificationsApi.markAllAsRead();
    mutateList();
    mutateCount();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--red)] text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--bg)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg)] border border-[var(--color-border)] shadow-xl rounded-[var(--radius-lg)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--bg-2)]">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {notifications && notifications.length > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Marcar todas lidas
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {!notifications ? (
              <div className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[var(--color-muted-foreground)]">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 flex gap-3 transition-colors ${!notif.isRead ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--bg-3)]'}`}
                  >
                    <div className="mt-1">
                      <div className={`w-2 h-2 rounded-full ${!notif.isRead ? 'bg-[var(--accent)]' : 'bg-transparent'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.isRead ? 'font-medium text-[var(--text)]' : 'text-[var(--text-2)]'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--accent)] p-1 h-fit"
                        title="Marcar como lida"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
