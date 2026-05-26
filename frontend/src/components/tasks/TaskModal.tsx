"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Task, TaskInput, tasksApi, TaskStatus, TaskPriority } from "@/lib/api/tasks";
import { categoriesApi, Category } from "@/lib/api/categories";
import { X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ConfirmModal from "@/components/ui/ConfirmModal";

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

  // Função para resetar formulário chamada do componente pai via remounting (key) ou quando abre
  useEffect(() => {
    if (isOpen) {
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
      setIsReadOnly(!!task); // Começa em modo de visualização se for uma tarefa existente
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

    setLoading(true);
    setError("");

    try {
      const payload: TaskInput = {
        ...formData,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        dueDate: formData.endDate || null, // dueDate is aliased to endDate
      };

      const isCompleted = payload.status === "DONE" && (!task || task.status !== "DONE");

      if (task) {
        await tasksApi.update(task.id, payload);
      } else {
        await tasksApi.create(payload);
      }

      if (isCompleted) {
        try {
          const audio = new Audio("/pop.ogg");
          audio.volume = 0.4;
          audio.play().catch((e) => console.log("Autoplay bloqueado pelo navegador:", e));
        } catch (e) {
          console.error("Falha ao tocar áudio:", e);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar a tarefa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">{task ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--bg-3)] transition-colors text-[var(--color-muted-foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-[var(--radius)]">
              {error}
            </div>
          )}

          {isReadOnly ? (
            /* Visualização apenas de Leitura */
            <div className="p-6 space-y-6">
              {/* Status, Prioridade e Categoria */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    formData.status === "DONE" 
                      ? "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20" 
                      : formData.status === "IN_PROGRESS" 
                      ? "bg-[var(--yellow)]/10 text-[var(--yellow)] border border-[var(--yellow)]/20" 
                      : "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
                  )}>
                    {formData.status === "DONE" ? "Concluída" : formData.status === "IN_PROGRESS" ? "Em Progresso" : "A Fazer"}
                  </span>
                  
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    formData.priority === "HIGH" 
                      ? "bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/20" 
                      : formData.priority === "MEDIUM" 
                      ? "bg-[var(--yellow)]/10 text-[var(--yellow)] border-[var(--yellow)]/20" 
                      : "bg-blue-500/10 text-blue-500 border-blue-500/20"
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

              {/* Descrição */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Descrição</h4>
                <p className="text-sm text-[var(--text-2)] bg-[var(--bg-2)] p-4 rounded-[var(--radius)] whitespace-pre-wrap leading-relaxed border border-[var(--color-border)]">
                  {formData.description || "Nenhuma descrição fornecida."}
                </p>
              </div>

              {/* Datas e Tempo Estimado */}
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
            /* Formulário de Edição */
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

        {isReadOnly ? (
          /* Botoes de Visualização */
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex items-center justify-between">
            <div>
              {task && (
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={loading}
                  className="text-[var(--red)] hover:bg-[var(--red)]/10 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : "Excluir"}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => setIsReadOnly(false)}
                className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity shadow-sm"
              >
                Editar
              </button>
            </div>
          </div>
        ) : (
          /* Botoes de Edição/Criação */
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end gap-3">
            <button
              type="button"
              onClick={task ? () => setIsReadOnly(true) : onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
            >
              {task ? "Voltar" : "Cancelar"}
            </button>
            <button
              type="submit"
              form="task-form"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (task ? "Atualizar" : "Criar Tarefa")}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa permanentemente?"
        confirmText="Excluir"
        isDestructive={true}
      />
    </div>
  );
}
