"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import Link from "next/link";
import { mutate } from "swr";
import TaskModal from "@/components/tasks/TaskModal";
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
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Minhas Tarefas", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Categorias", href: "/dashboard/categories", icon: Folder },
    { name: "Calendário", href: "/dashboard/calendar", icon: Calendar },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-2)]">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[var(--bg)] border-r border-[var(--color-border)] flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)]">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center">
              TF
            </div>
            TaskFlow
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? "bg-[var(--color-muted)] text-[var(--accent)]" 
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}

            {user.role === "ADMIN" && (
              <div className="pt-4 mt-4 border-t border-[var(--color-border)]">
                <p className="px-3 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Administração</p>
                <Link 
                  href="/dashboard/admin" 
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === "/dashboard/admin" 
                      ? "bg-[var(--red)]/10 text-[var(--red)]" 
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Painel Admin
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] flex flex-col gap-2">
          <Link 
            href="/dashboard/profile"
            className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--bg-3)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] font-bold text-sm overflow-hidden border border-[var(--color-border)]">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">{user.name}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors mt-2"
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
            <button 
              onClick={() => alert("Você não possui novas notificações no momento.")}
              className="p-2 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--text)] transition-colors relative"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border border-[var(--bg)]"></span>
            </button>
            <button 
              onClick={() => setIsNewTaskModalOpen(true)}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
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

      <TaskModal 
        isOpen={isNewTaskModalOpen} 
        onClose={() => setIsNewTaskModalOpen(false)} 
        onSuccess={() => mutate("/tasks")} 
      />
    </div>
  );
}
