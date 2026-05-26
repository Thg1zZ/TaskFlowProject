"use client";

import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import {
  adminApi,
  AdminUser,
  AdminStats,
  AuditLog,
  AuditLogPage,
} from "@/lib/api/admin";
import {
  ShieldAlert, Users, Trash2, Loader2, AlertCircle,
  BarChart3, LockKeyhole, UserCog, Mail, TrendingUp,
  Activity, LogIn, X, Check, Shield, ShieldOff,
  ScrollText, ChevronLeft, ChevronRight, CheckCircle2,
  Ban, AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useCallback } from "react";

// ── Tipos de aba ─────────────────────────────────────────────────────────────
type Tab = "users" | "audit";

// ── Modal de edição de e-mail ─────────────────────────────────────────────────
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Badge de resultado de auditoria ───────────────────────────────────────────
function ResultBadge({ result }: { result: AuditLog["result"] }) {
  if (result === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
        <CheckCircle2 className="w-3 h-3" /> Sucesso
      </span>
    );
  }
  if (result === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
        <Ban className="w-3 h-3" /> Bloqueado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--red)]/10 text-[var(--red)] ring-1 ring-[var(--red)]/20">
      <AlertTriangle className="w-3 h-3" /> Falhou
    </span>
  );
}

// ── Aba de auditoria ──────────────────────────────────────────────────────────
function AuditTab() {
  const [page, setPage] = useState(0);

  const fetchAuditLogs = useCallback(
    () => adminApi.getAuditLogs(page),
    [page]
  );

  const {
    data,
    isLoading,
    error,
  } = useSWR<AuditLogPage>(["/admin/audit-logs", page], fetchAuditLogs, {
    revalidateOnFocus: false,
  });

  const actionLabel: Record<string, string> = {
    GET_USERS:      "Listou usuários",
    DELETE_USER:    "Excluiu usuário",
    CHANGE_EMAIL:   "Alterou e-mail",
    CHANGE_ROLE:    "Alterou role",
    GET_STATS:      "Consultou estatísticas",
    GET_AUDIT_LOGS: "Consultou logs de auditoria",
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da aba */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-[var(--text-2)]" />
          <h2 className="text-base font-semibold">Log de Auditoria</h2>
          {data && (
            <span className="text-xs text-[var(--text-2)] bg-[var(--bg-3)] px-2 py-0.5 rounded-full">
              {data.totalElements} registro{data.totalElements !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-3)]">
          Todas as ações administrativas — incluindo tentativas bloqueadas — são registradas de forma imutável.
        </p>
      </div>

      {/* Tabela */}
      <div className="glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {error ? (
            <div className="p-8 flex items-center justify-center gap-2 text-[var(--red)]">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar o log de auditoria.
            </div>
          ) : isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : !data?.content?.length ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-[var(--text-3)]">
              <ScrollText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma ação registrada ainda.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[var(--bg-2)] text-[var(--text-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Quando</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Admin</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Ação</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Alvo</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)]">Detalhes</th>
                  <th className="px-4 py-3 font-medium border-b border-[var(--color-border)] text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.content.map((log) => (
                  <tr key={log.id} className={`hover:bg-[var(--bg-3)]/50 transition-colors ${log.result === "BLOCKED" ? "bg-orange-500/5" : log.result === "FAILED" ? "bg-[var(--red)]/5" : ""}`}>
                    <td className="px-4 py-3 text-xs text-[var(--text-3)] whitespace-nowrap font-mono">
                      {format(parseISO(log.performedAt), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[var(--text)] truncate max-w-[140px]">
                          {log.adminEmail}
                        </span>
                        <span className="text-[10px] text-[var(--text-3)]">
                          {log.adminRole === "ROLE_SUPER_ADMIN" ? "👑 Master" : "🛡 Admin"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--text)]">
                        {actionLabel[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.targetUserEmail ? (
                        <span className="text-xs text-[var(--text-2)] truncate max-w-[140px] block">
                          {log.targetUserEmail}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-3)] italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {log.details ? (
                        <span className="text-xs text-[var(--text-2)] line-clamp-2" title={log.details}>
                          {log.details}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-3)] italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ResultBadge result={log.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--bg-2)]/40">
            <p className="text-xs text-[var(--text-3)]">
              Página {data.number + 1} de {data.totalPages} &middot; {data.totalElements} registros
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.number === 0}
                className="p-1.5 rounded-md hover:bg-[var(--bg-3)] disabled:opacity-30 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2 font-mono">{data.number + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.number >= data.totalPages - 1}
                className="p-1.5 rounded-md hover:bg-[var(--bg-3)] disabled:opacity-30 transition-colors"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba de usuários ───────────────────────────────────────────────────────────
function UsersTab({ currentUser }: { currentUser: { id: number; role: string } }) {
  const [emailModalUser, setEmailModalUser] = useState<AdminUser | null>(null);
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);

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
                          u.role === "ROLE_SUPER_ADMIN"
                            ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30"
                            : u.role === "ROLE_ADMIN"
                            ? "bg-[var(--red)]/10 text-[var(--red)]"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        {u.role === "ROLE_SUPER_ADMIN" ? (
                          <span>👑</span>
                        ) : u.role === "ROLE_ADMIN" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <UserCog className="w-3 h-3" />
                        )}
                        {u.role === "ROLE_SUPER_ADMIN" ? "Master" : u.role === "ROLE_ADMIN" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text-2)] font-mono text-xs">{u.taskCount}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-2)] font-mono text-xs">{u.accessCount}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] text-xs whitespace-nowrap">
                      {format(new Date(u.createdAt), "dd MMM yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentUser.id !== u.id && u.role !== "ROLE_SUPER_ADMIN" && (
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
                          {u.role !== "ROLE_ADMIN" || currentUser.role === "ROLE_ADMIN" ? (
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  // [FRONTEND] Proteção visual — a real acontece no backend com JWT + RBAC
  if (currentUser?.role !== "ROLE_ADMIN" && currentUser?.role !== "ROLE_SUPER_ADMIN") {
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

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "users",  label: "Usuários",  icon: Users      },
    { id: "audit",  label: "Auditoria", icon: ScrollText },
  ];

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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-2)] rounded-[var(--radius-lg)] w-fit border border-[var(--color-border)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-all ${
              activeTab === id
                ? "bg-[var(--bg)] text-[var(--text)] shadow-sm border border-[var(--color-border)]"
                : "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      {activeTab === "users" ? (
        <UsersTab currentUser={{ id: currentUser.id, role: currentUser.role }} />
      ) : (
        <AuditTab />
      )}
    </div>
  );
}
