"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";
import { Subtask, SubtaskInput } from "@/lib/api/tasks";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_SUBTASKS = 20;

export function SubtaskProgress({ subtasks }: { subtasks: Subtask[] }) {
  const done = subtasks.filter((s) => s.done).length;
  const percent = Math.round((done / subtasks.length) * 100);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-2)]">
      <span className="w-12 h-1.5 rounded-full bg-[var(--bg-3)] overflow-hidden">
        <span
          className={clsx("block h-full rounded-full", percent === 100 ? "bg-[var(--green)]" : "bg-[var(--accent)]")}
          style={{ width: `${percent}%` }}
        />
      </span>
      {done}/{subtasks.length}
    </span>
  );
}

interface ChecklistProps {
  subtasks: Subtask[];
  onToggle?: (subtaskId: number, done: boolean) => void;
}

/** Lista de leitura: marca e desmarca itens quando onToggle é informado. */
export function SubtaskChecklist({ subtasks, onToggle }: ChecklistProps) {
  return (
    <ul className="space-y-1.5">
      {subtasks.map((s) => (
        <li key={s.id}>
          <label className={clsx("flex items-start gap-2 text-sm", onToggle ? "cursor-pointer" : "cursor-default")}>
            <input
              type="checkbox"
              checked={s.done}
              disabled={!onToggle}
              onChange={(e) => onToggle?.(s.id, e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[var(--accent)]"
            />
            <span className={clsx(s.done ? "line-through text-[var(--text-3)]" : "text-[var(--text)]")}>{s.title}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

interface EditorProps {
  value: SubtaskInput[];
  onChange: (value: SubtaskInput[]) => void;
}

/** Edição do checklist dentro do formulário da tarefa. */
export function SubtaskEditor({ value, onChange }: EditorProps) {
  const [draft, setDraft] = useState("");
  const { t } = useI18n();

  const add = () => {
    const title = draft.trim();
    if (!title || value.length >= MAX_SUBTASKS) return;
    onChange([...value, { title, done: false }]);
    setDraft("");
  };

  const update = (index: number, changes: Partial<SubtaskInput>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={item.id ?? `new-${index}`} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => update(index, { done: e.target.checked })}
            className="w-4 h-4 rounded accent-[var(--accent)]"
            aria-label={t("status.DONE")}
          />
          <input
            type="text"
            value={item.title}
            maxLength={200}
            onChange={(e) => update(index, { title: e.target.value })}
            className="flex-1 px-2 py-1 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red)]/10"
            aria-label={t("subtasks.remove")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      {value.length < MAX_SUBTASKS && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={t("subtasks.addPlaceholder")}
            className="flex-1 px-2 py-1 bg-[var(--bg)] border border-dashed border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={add}
            className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10"
            aria-label={t("subtasks.add")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
