"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import Link from "next/link";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Folder, 
  Calendar, 
  LogOut, 
  Sun, 
  Moon,
  Search,
  Bell
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-2)]">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[var(--bg)] border-r border-[var(--color-border)] flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center">
              TF
            </div>
            TaskFlow
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-[var(--color-muted)] text-[var(--accent)]">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link href="/dashboard/tasks" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors">
              <CheckSquare className="w-4 h-4" />
              Minhas Tarefas
            </Link>
            <Link href="/dashboard/categories" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors">
              <Folder className="w-4 h-4" />
              Categorias
            </Link>
            <Link href="/dashboard/calendar" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors">
              <Calendar className="w-4 h-4" />
              Calendário
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-[var(--bg)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input 
                type="text" 
                placeholder="Buscar tarefas..." 
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-3)] border-transparent rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border border-[var(--bg)]"></span>
            </button>
            <button className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity">
              + Nova Tarefa
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
