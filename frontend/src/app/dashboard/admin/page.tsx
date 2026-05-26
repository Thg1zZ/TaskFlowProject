"use client";

import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { adminApi, AdminUser, AdminStats } from "@/lib/api/admin";
import {
  ShieldAlert, Users, Trash2, Loader2, AlertCircle,
  BarChart3, LockKeyhole, UserCog, Mail, TrendingUp,
  Activity, LogIn, X, Check, Shield, ShieldOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

// ── Modal de edição de e-mail ───────────────────────────────────────────────
function ChangeEmailModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: (updated: AdminUser) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.toLowerCase().trim();
    if (!normalized || normalized === user.email) {
      setError("Informe um e-mail diferente do atual.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const updated = await adminApi.changeUserEmail(user.id, normalized);
      onSuccess(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao alterar o e-mail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-[var(--bg)] w-full max-w-sm rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold">Alterar E-mail</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--bg-3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-xs text-[var(--text-2)]">
            Alterando e-mail de: <span className="font-semibold text-[var(--text)]">{user.name}</span>
          </p>
          {error && (
            <div className="p-2 text-xs text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-[var(--radius)]">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-2)]">Novo e-mail</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="novo@email.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-3)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stat Card Component ─────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="p-5 glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-2)] leading-tight">{label}</p>
        <h3 className="text-2xl font-bold mt-0.5">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mt-1" /> : value}
        </h3>
        {sub && <p className="text-xs text-[var(--text-3)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [emailModalUser, setEmailModalUser] = useState<AdminUser | null>(null);
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);

  if (currentUser?.role !== "ROLE_ADMIN") {
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

  const {
    data: users,
    error: usersError,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR<AdminUser[]>("/admin/users", adminApi.getUsers);

  const {
    data: stats,
    isLoading: statsLoading,
  } = useSWR<AdminStats>("/admin/stats", adminApi.getStats);

  const handleDeleteUser = async (id: number) => {
    if (confirm("ATENÇÃO: Isso excluirá permanentemente o usuário e todas as suas tarefas. Deseja continuar?")) {
      try {
        await adminApi.deleteUser(id);
        mutateUsers();
      } catch {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  const handleToggleRole = async (u: AdminUser) => {
    const newRole = u.role === "ROLE_ADMIN" ? "ROLE_USER" : "ROLE_ADMIN";
    const action = newRole === "ROLE_ADMIN" ? "PROMOVER" : "REBAIXAR";
    if (!confirm(`Tem certeza que deseja ${action} o usuário "${u.name}" para ${newRole}?`)) return;

    setRoleLoadingId(u.id);
    try {
      const updated = await adminApi.changeUserRole(u.id, newRole);
      mutateUsers((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao alterar role.");
    } finally {
      setRoleLoadingId(null);
    }
  };

  const handleEmailSuccess = (updated: AdminUser) => {
    mutateUsers((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)));
    setEmailModalUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--red)]/10 text-[var(--red)] rounded-lg">
          <LockKeyhole className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Painel Administrativo</h1>
          <p className="text-[var(--text-2)] text-sm">Controle e monitoramento do sistema.</p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total de Usuários"
          value={stats?.totalUsers ?? 0}
          color="bg-[var(--accent)]/10 text-[var(--accent)]"
          loading={statsLoading}
        />
        <StatCard
          icon={BarChart3}
          label="Total de Tarefas"
          value={stats?.totalTasks ?? 0}
          color="bg-[var(--green)]/10 text-[var(--green)]"
          loading={statsLoading}
        />
        <StatCard
          icon={LogIn}
          label="Total de Acessos"
          value={stats?.totalAccesses ?? 0}
          sub="logins registrados"
          color="bg-purple-500/10 text-purple-500"
          loading={statsLoading}
        />
        <StatCard
          icon={Activity}
          label="Acessos (7 dias)"
          value={stats?.accessesLast7Days ?? 0}
          color="bg-orange-500/10 text-orange-500"
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Novos cadastros"
          value={stats?.newUsersLast7Days ?? 0}
          sub="últimos 7 dias"
          color="bg-sky-500/10 text-sky-500"
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Novos cadastros"
          value={stats?.newUsersLast30Days ?? 0}
          sub="últimos 30 dias"
          color="bg-teal-500/10 text-teal-500"
          loading={statsLoading}
        />
        <StatCard
          icon={Activity}
          label="Acessos (30 dias)"
          value={stats?.accessesLast30Days ?? 0}
          color="bg-pink-500/10 text-pink-500"
          loading={statsLoading}
        />
      </div>

      {/* ── Users Table ── */}
      <div className="glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--bg-2)]/50 flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Base de Usuários
          </h2>
          {users && (
            <span className="text-xs text-[var(--text-2)] bg-[var(--bg-3)] px-2 py-0.5 rounded-full">
              {users.length} registrado{users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {usersError ? (
            <div className="p-8 flex items-center justify-center gap-2 text-[var(--red)]">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar a lista de usuários.
            </div>
          ) : usersLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[var(--bg-2)] text-[var(--text-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">ID</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Nome</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">E-mail</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)] text-center">Role</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)] text-center">Tarefas</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)] text-center">Acessos</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Cadastro</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-3)]/50 transition-colors">
                    <td className="px-4 py-3 text-[var(--text-3)] text-xs font-mono">#{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xs flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--text)] truncate max-w-[120px]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-2)] text-xs max-w-[160px] truncate">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                          u.role === "ROLE_ADMIN"
                            ? "bg-[var(--red)]/10 text-[var(--red)]"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        {u.role === "ROLE_ADMIN" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <UserCog className="w-3 h-3" />
                        )}
                        {u.role === "ROLE_ADMIN" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text-2)] font-mono text-xs">{u.taskCount}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-2)] font-mono text-xs">{u.accessCount}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] text-xs whitespace-nowrap">
                      {format(new Date(u.createdAt), "dd MMM yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentUser?.id !== u.id && (
                        <div className="flex items-center justify-end gap-1">
                          {/* Alterar e-mail */}
                          <button
                            onClick={() => setEmailModalUser(u)}
                            className="p-1.5 text-[var(--text-2)] hover:text-[var(--accent)] rounded-md hover:bg-[var(--accent)]/10 transition-colors"
                            title="Alterar e-mail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Alternar role */}
                          {u.role !== "ROLE_ADMIN" || currentUser?.role === "ROLE_ADMIN" ? (
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={roleLoadingId === u.id}
                              className={`p-1.5 rounded-md transition-colors ${
                                u.role === "ROLE_ADMIN"
                                  ? "text-[var(--red)] hover:bg-[var(--red)]/10"
                                  : "text-[var(--text-2)] hover:text-purple-500 hover:bg-purple-500/10"
                              }`}
                              title={u.role === "ROLE_ADMIN" ? "Rebaixar para Usuário" : "Promover para Admin"}
                            >
                              {roleLoadingId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : u.role === "ROLE_ADMIN" ? (
                                <ShieldOff className="w-3.5 h-3.5" />
                              ) : (
                                <Shield className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : null}

                          {/* Excluir */}
                          {u.role !== "ROLE_ADMIN" && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-[var(--text-2)] hover:text-[var(--red)] rounded-md hover:bg-[var(--red)]/10 transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de troca de e-mail */}
      {emailModalUser && (
        <ChangeEmailModal
          user={emailModalUser}
          onClose={() => setEmailModalUser(null)}
          onSuccess={handleEmailSuccess}
        />
      )}
    </div>
  );
}
