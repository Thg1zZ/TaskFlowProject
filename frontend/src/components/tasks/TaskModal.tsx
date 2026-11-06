"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { Subtask, Task, TaskInput, tasksApi, TaskStatus, TaskPriority, TaskRecurrence } from "@/lib/api/tasks";
import { categoriesApi, Category } from "@/lib/api/categories";
import { X, Loader2, Repeat } from "lucide-react";
import TagInput, { TagChip } from "./TagInput";
import { SubtaskChecklist, SubtaskEditor, SubtaskProgress } from "./Subtasks";
import { useSubtaskToggle } from "@/hooks/useTasks";
import { useI18n } from "@/i18n/I18nProvider";
import { getApiErrorMessage } from "@/lib/apiError";
import clsx from "clsx";
import { format } from "date-fns";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import ShareModal from "@/components/collaboration/ShareModal";
import ParticipantAvatars from "@/components/collaboration/ParticipantAvatars";

const RECURRENCES: TaskRecurrence[] = ["DAILY", "WEEKLY", "MONTHLY"];

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
  const { t, dateLocale } = useI18n();

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
    recurrence: null,
    tags: [],
    subtasks: [],
  });

  const { data: categories } = useSWR<Category[]>("/categories", categoriesApi.getAll);
  const { data: allTasks } = useSWR<Task[]>("/tasks", tasksApi.getAll);
  const tagSuggestions = useMemo(
    () => Array.from(new Set((allTasks ?? []).flatMap((t) => t.tags ?? []))).sort(),
    [allTasks]
  );
  const toggleSubtask = useSubtaskToggle();

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
        recurrence: task.recurrence ?? null,
        tags: task.tags ?? [],
        subtasks: (task.subtasks ?? []).map(({ id, title, done }) => ({ id, title, done })),
      } : {
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        startDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : "",
        endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : "",
        estimatedMinutes: null,
        categoryId: null,
        recurrence: null,
        tags: [],
        subtasks: [],
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
    } catch (err) {
      setError(getApiErrorMessage(err, t("taskModal.deleteError")));
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  if (!isOpen) return null;

  // Na visualização, todos os itens vêm do servidor e têm id
  const savedSubtasks = (formData.subtasks ?? []).filter((s): s is Subtask => s.id !== undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError(t("taskModal.titleRequired"));
      return;
    }

    if (formData.startDate && formData.endDate) {
      if (formData.startDate > formData.endDate) {
        setError(t("taskModal.dateRangeError"));
        return;
      }
    }

    if (formData.startDate) {
      const start = new Date(formData.startDate + "T00:00:00");
      if (isNaN(start.getTime())) {
        setError(t("taskModal.invalidStartDate"));
        return;
      }
    }

    if (formData.endDate) {
      const end = new Date(formData.endDate + "T00:00:00");
      if (isNaN(end.getTime())) {
        setError(t("taskModal.invalidEndDate"));
        return;
      }
    }

    if (formData.estimatedMinutes !== null && formData.estimatedMinutes !== undefined && formData.estimatedMinutes < 0) {
      setError(t("taskModal.negativeEstimate"));
      return;
    }

    setLoading(true);
    setError("");

    const payload: TaskInput = {
      ...formData,
      subtasks: formData.subtasks?.filter((s) => s.title.trim()),
    };

    try {
      if (task) {
        await tasksApi.update(task.id, payload);
      } else {
        await tasksApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t("taskModal.saveError")));
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
              {task ? t("taskModal.details") : t("taskModal.newTask")}
              {isReadOnly && <span className="ml-2 text-xs font-medium px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">{t("taskModal.viewOnly")}</span>}
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
                    {t("taskModal.share")}
                  </button>
                )}
              </div>
            )}
            <button 
              onClick={onClose}
              aria-label={t("common.close")}
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
                    {t(`status.${formData.status}`)}
                  </span>
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    formData.priority === "HIGH" ? "bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/20" : formData.priority === "MEDIUM" ? "bg-[var(--yellow)]/10 text-[var(--yellow)] border-[var(--yellow)]/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                    {t("taskModal.priorityLabel", { priority: t(`priority.${formData.priority}`) })}
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
                <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{t("taskModal.description")}</h4>
                <p className="text-sm text-[var(--text-2)] bg-[var(--bg-2)] p-4 rounded-[var(--radius)] whitespace-pre-wrap leading-relaxed border border-[var(--color-border)]">
                  {formData.description || t("taskModal.noDescription")}
                </p>
              </div>
              {(formData.tags?.length || formData.recurrence) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {formData.recurrence && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
                      <Repeat className="w-3 h-3" /> {t(`recurrence.${formData.recurrence}`)}
                    </span>
                  )}
                  {formData.tags?.map((tag) => <TagChip key={tag} tag={tag} />)}
                </div>
              ) : null}
              {task && savedSubtasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{t("taskModal.subtasks")}</h4>
                    <SubtaskProgress subtasks={savedSubtasks} />
                  </div>
                  <SubtaskChecklist
                    subtasks={savedSubtasks}
                    onToggle={canEdit ? (id, done) => {
                      setFormData({ ...formData, subtasks: formData.subtasks?.map((s) => (s.id === id ? { ...s, done } : s)) });
                      toggleSubtask(task.id, id, done);
                    } : undefined}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55">
                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{t("taskModal.startDate")}</span>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {formData.startDate ? format(new Date(formData.startDate + 'T00:00:00'), "PPP", { locale: dateLocale }) : t("taskModal.notSet")}
                  </p>
                </div>
                <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55">
                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{t("taskModal.deadline")}</span>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {formData.endDate ? format(new Date(formData.endDate + 'T00:00:00'), "PPP", { locale: dateLocale }) : t("taskModal.notSet")}
                  </p>
                </div>
                {formData.estimatedMinutes && (
                  <div className="space-y-1 bg-[var(--bg-3)]/50 p-3 rounded-[var(--radius)] border border-[var(--color-border)]/55 sm:col-span-2">
                    <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{t("taskModal.estimatedTime")}</span>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {formData.estimatedMinutes >= 60 
                        ? `${Math.floor(formData.estimatedMinutes / 60)}h ${formData.estimatedMinutes % 60}min` 
                        : t("taskModal.minutes", { count: formData.estimatedMinutes })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form id="task-form" onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("taskModal.title")} <span className="text-[var(--red)]">*</span></label>
                <input
                  type="text"
                  autoFocus
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  placeholder={t("taskModal.titlePlaceholder")}
                  aria-label={t("taskModal.title")}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("taskModal.description")}</label>
                <textarea
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none"
                  placeholder={t("taskModal.descriptionPlaceholder")}
                  aria-label={t("taskModal.description")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.status")}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    aria-label={t("taskModal.status")}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="TODO">{t("status.TODO")}</option>
                    <option value="IN_PROGRESS">{t("status.IN_PROGRESS")}</option>
                    <option value="DONE">{t("status.DONE")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.priority")}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    aria-label={t("taskModal.priority")}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="LOW">{t("priority.LOW")}</option>
                    <option value="MEDIUM">{t("priority.MEDIUM")}</option>
                    <option value="HIGH">{t("priority.HIGH")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.startDate")}</label>
                  <input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    aria-label={t("taskModal.startDate")}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.endDate")}</label>
                  <input
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    aria-label={t("taskModal.endDate")}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.estimate")}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedMinutes || ""}
                    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                    placeholder="120"
                    aria-label={t("taskModal.estimate")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("taskModal.category")}</label>
                  <select
                    value={formData.categoryId || ""}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : null })}
                    aria-label={t("taskModal.category")}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  >
                    <option value="">{t("taskModal.noCategory")}</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("taskModal.repeat")}</label>
                <select
                  value={formData.recurrence ?? ""}
                  onChange={(e) => setFormData({ ...formData, recurrence: (e.target.value || null) as TaskRecurrence | null })}
                  aria-label={t("taskModal.repeat")}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                >
                  <option value="">{t("recurrence.none")}</option>
                  {RECURRENCES.map((r) => (
                    <option key={r} value={r}>{t(`recurrence.${r}`)}</option>
                  ))}
                </select>
                {formData.recurrence && (
                  <p className="text-xs text-[var(--text-3)]">{t("taskModal.repeatHint")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("taskModal.tags")}</label>
                <TagInput
                  value={formData.tags ?? []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  suggestions={tagSuggestions}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("taskModal.subtasks")}</label>
                <SubtaskEditor
                  value={formData.subtasks ?? []}
                  onChange={(subtasks) => setFormData({ ...formData, subtasks })}
                />
              </div>
            </form>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-between items-center">
            {task && !isReadOnly && (
                <button type="button" onClick={() => setIsConfirmOpen(true)} className="text-sm text-[var(--red)] font-medium hover:underline">{t("common.delete")}</button>
            )}
             <div className="flex gap-3 ml-auto">
                 <button
                   type="button"
                   onClick={(task && !isReadOnly) ? () => setIsReadOnly(true) : onClose}
                   className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
                 >
                   {task && isReadOnly ? t("common.close") : t("common.cancel")}
                 </button>
                 {isReadOnly && canEdit && (
                   <button
                     type="button"
                     onClick={() => setIsReadOnly(false)}
                     className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity"
                   >
                     {t("common.edit")}
                   </button>
                 )}
                 {!isReadOnly && (
                   <button
                     type="submit"
                     form="task-form"
                     disabled={loading}
                     className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                   >
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
                   </button>
                 )}
             </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t("taskModal.deleteTitle")}
        message={t("taskModal.deleteMessage")}
        confirmText={t("taskModal.deleteConfirm")}
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
