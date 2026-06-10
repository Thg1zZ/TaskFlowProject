"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { Task, TaskInput, tasksApi, TaskStatus, TaskPriority } from "@/lib/api/tasks";
import { categoriesApi, Category } from "@/lib/api/categories";
import { X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import ShareModal from "@/components/collaboration/ShareModal";
import ParticipantAvatars from "@/components/collaboration/ParticipantAvatars";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  initialDate?: Date;
  onSuccess: () => void;
}

export default function TaskModal({ isOpen, onClose, task, initialDate, onSuccess }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<'PRIVATE'|'PUBLIC'>('PRIVATE');

  const { user } = useAuth();

  const canEdit = useMemo(() => {
    if (!task || !user) return false;
    const isOwner = task.ownerId === user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participant = task.participants?.find((p: any) => p.userId === user.id);
    const role = isOwner ? 'OWNER' : (participant?.role || 'VIEWER');
    return role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR';
  }, [task, user]);

  const [formData, setFormData] = useState<TaskInput>({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    startDate: "",
    endDate: "",
    estimatedMinutes: null,
    categoryId: null,
  });

  const { data: categories } = useSWR<Category[]>("/categories", categoriesApi.getAll);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(task ? {
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        startDate: task.startDate || "",
        endDate: task.endDate || task.dueDate || "",
        estimatedMinutes: task.estimatedMinutes || null,
        categoryId: task.categoryId || null,
      } : {
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        startDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : "",
        endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : "",
        estimatedMinutes: null,
        categoryId: null,
      });
      setError("");

      if (task && user) {
        setPrivacyMode(task.privacyMode);
        // Sempre abre tarefas existentes em modo de visualização (read-only) por padrão
        setIsReadOnly(true);
      } else {
        setIsReadOnly(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task, initialDate]);

  const handleDelete = async () => {
    if (!task) return;
    setLoading(true);
    try {
      await tasksApi.delete(task.id);
      onSuccess();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao excluir a tarefa.");
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("O título é obrigatório.");
      return;
    }

    if (formData.startDate && formData.endDate) {
      if (formData.startDate > formData.endDate) {
        setError("A data de início não pode ser posterior à data de conclusão.");
        return;
      }
    }

    if (formData.startDate) {
      const start = new Date(formData.startDate + "T00:00:00");
      if (isNaN(start.getTime())) {
        setError("Data de início inválida.");
        return;
      }
    }

    if (formData.endDate) {
      const end = new Date(formData.endDate + "T00:00:00");
      if (isNaN(end.getTime())) {
        setError("Data de conclusão inválida.");
        return;
      }
    }

    if (formData.estimatedMinutes !== null && formData.estimatedMinutes !== undefined && formData.estimatedMinutes < 0) {
      setError("A estimativa de tempo não pode ser negativa.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (task) {
        await tasksApi.update(task.id, formData);
      } else {
        await tasksApi.create(formData);
      }
      onSuccess();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || "Ocorreu um erro ao salvar a tarefa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--bg-2)] relative">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {task ? "Detalhes da Tarefa" : "Nova Tarefa"}
              {isReadOnly && <span className="ml-2 text-xs font-medium px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">Apenas Visualização</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {task && (
              <div className="flex items-center gap-2 mr-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ParticipantAvatars participants={task.participants as any} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {user && (task.ownerId === user.id || task.participants?.some((p: any) => p.userId === user.id && p.role === 'ADMIN')) && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded bg-[var(--bg-3)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors border border-[var(--color-border)]"
                  >
                    Compartilhar
                  </button>
                )}
              </div>
            )}
            <button 
              onClick={onClose}
              className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--bg-3)] hover:text-[var(--text)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-[var(--red)]/10 text-[var(--red)] text-sm rounded-[var(--radius)] border border-[var(--red)]/20">
              {error}
            </div>
          )}

          {isReadOnly ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    formData.status === "DONE" ? "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20" : formData.status === "IN_PROGRESS" ? "bg-[var(--yellow)]/10 text-[var(--yellow)] border border-[var(--yellow)]/20" : "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
                  )}>
                    {formData.status === "DONE" ? "Concluída" : formData.status === "IN_PROGRESS" ? "Em Progresso" : "A Fazer"}
                  </span>
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    formData.priority === "HIGH" ? "bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/20" : formData.priority === "MEDIUM" ? "bg-[var(--yellow)]/10 text-[var(--yellow)] border-[var(--yellow)]/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                    Prioridade {formData.priority === "HIGH" ? "Alta" : formData.priority === "MEDIUM" ? "Média" : "Baixa"}
                  </span>
                  {formData.categoryId && (
                    <span className="bg-[var(--bg-3)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[var(--text-2)] flex items-center gap-1">
                      <span>{categories?.find(c => c.id === formData.categoryId)?.icon}</span>
                      <span>{categories?.find(c => c.id === formData.categoryId)?.name}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] tracking-tight">{formData.title}</h3>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Descrição</h4>
                <p className="text-sm text-[var(--text-2)] bg-[var(--bg-2)] p-4 rounded-[var(--radius)] whitespace-pre-wrap leading-relaxed border border-[var(--color-border)]">
                  {formData.description || "Nenhuma descrição fornecida."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55">
                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Data de Início</span>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {formData.startDate ? format(new Date(formData.startDate + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Não informada"}
                  </p>
                </div>
                <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55">
                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Prazo Final</span>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {formData.endDate ? format(new Date(formData.endDate + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Não informado"}
                  </p>
                </div>
                {formData.estimatedMinutes && (
                  <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55 sm:col-span-2">
                    <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Tempo Estimado</span>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {formData.estimatedMinutes >= 60 
                        ? `${Math.floor(formData.estimatedMinutes / 60)}h ${formData.estimatedMinutes % 60}min` 
                        : `${formData.estimatedMinutes} minutos`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form id="task-form" onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título <span className="text-[var(--red)]">*</span></label>
                <input
                  type="text"
                  autoFocus
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  placeholder="Ex: Atualizar documentação"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none"
                  placeholder="Detalhes sobre a tarefa..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="TODO">A Fazer</option>
                    <option value="IN_PROGRESS">Em Progresso</option>
                    <option value="DONE">Concluída</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de Conclusão</label>
                  <input
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Estimativa (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedMinutes || ""}
                    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                    placeholder="Ex: 120"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    value={formData.categoryId || ""}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="">Sem Categoria</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-between items-center">
            {task && !isReadOnly && (
                <button type="button" onClick={() => setIsConfirmOpen(true)} className="text-sm text-[var(--red)] font-medium hover:underline">Excluir</button>
            )}
             <div className="flex gap-3 ml-auto">
                 <button
                   type="button"
                   onClick={(task && !isReadOnly) ? () => setIsReadOnly(true) : onClose}
                   className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
                 >
                   {task ? (isReadOnly ? "Fechar" : "Cancelar") : "Cancelar"}
                 </button>
                 {isReadOnly && canEdit && (
                   <button
                     type="button"
                     onClick={() => setIsReadOnly(false)}
                     className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity"
                   >
                     Editar
                   </button>
                 )}
                 {!isReadOnly && (
                   <button
                     type="submit"
                     form="task-form"
                     disabled={loading}
                     className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                   >
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                   </button>
                 )}
             </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        isDestructive={true}
      />

      {task && (
        <ShareModal 
          taskId={task.id}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          privacyMode={privacyMode}
          onPrivacyChange={(newMode) => {
            setPrivacyMode(newMode);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}
