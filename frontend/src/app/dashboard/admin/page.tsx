"use client";

import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { adminApi, AdminUser } from "@/lib/api/admin";
import { ShieldAlert, Users, Trash2, Loader2, AlertCircle, BarChart3, LockKeyhole } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPage() {
  const { user } = useAuth();

  // Se o usuário não for ADMIN, bloqueia visualmente. O backend também fará esse bloqueio.
  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="w-20 h-20 bg-[var(--red)]/10 rounded-full flex items-center justify-center mb-6 text-[var(--red)]">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Acesso Negado</h1>
        <p className="text-[var(--text-2)] text-center max-w-md">
          Você não possui privilégios de Administrador para acessar esta área.
        </p>
      </div>
    );
  }

  // Se for admin, carrega os dados
  const { data: users, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR<AdminUser[]>("/admin/users", adminApi.getUsers);
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR("/admin/stats", adminApi.getStats);

  const handleDeleteUser = async (id: number) => {
    if (confirm("ATENÇÃO: Isso excluirá permanentemente o usuário e todas as suas tarefas. Deseja continuar?")) {
      try {
        await adminApi.deleteUser(id);
        mutateUsers();
      } catch (err) {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--red)]/10 text-[var(--red)] rounded-lg">
          <LockKeyhole className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Painel Administrativo</h1>
          <p className="text-[var(--text-2)] text-sm">Controle de sistema e usuários.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-2)]">Total de Usuários</p>
            <h3 className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalUsers || 0}
            </h3>
          </div>
        </div>

        <div className="p-6 glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-center gap-4">
          <div className="p-4 bg-[var(--green)]/10 text-[var(--green)] rounded-full">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-2)]">Total de Tarefas Globais</p>
            <h3 className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalTasks || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--bg-2)]/50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Base de Usuários
          </h2>
        </div>

        <div className="overflow-x-auto">
          {usersError ? (
            <div className="p-8 text-center text-[var(--red)]">Erro ao carregar a lista de usuários.</div>
          ) : usersLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[var(--bg-2)] text-[var(--text-2)]">
                <tr>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)]">ID</th>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)]">Nome</th>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)]">Email</th>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)]">Role</th>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)]">Cadastro</th>
                  <th className="px-6 py-4 font-medium border-b border-[var(--color-border)] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-3)] transition-colors">
                    <td className="px-6 py-4 font-medium">#{u.id}</td>
                    <td className="px-6 py-4 font-semibold text-[var(--text)]">{u.name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${u.role === 'ADMIN' ? 'bg-[var(--red)]/10 text-[var(--red)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-2)] text-xs">
                      {format(new Date(u.createdAt), "dd MMM yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.id !== u.id && u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-[var(--red)] hover:bg-[var(--red)]/10 p-2 rounded-md transition-colors"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
