"use client";

import { addDays, isBefore, isSameDay, startOfDay } from "date-fns";
import { FilterX } from "lucide-react";
import { Task, TaskPriority } from "@/lib/api/tasks";
import { Category } from "@/lib/api/categories";
import { useI18n } from "@/i18n/I18nProvider";

export type DueFilter = "ALL" | "OVERDUE" | "TODAY" | "WEEK";

export interface TaskFilters {
  priority: "ALL" | TaskPriority;
  categoryId: "ALL" | number;
  tag: string;
  due: DueFilter;
}

export const EMPTY_FILTERS: TaskFilters = { priority: "ALL", categoryId: "ALL", tag: "", due: "ALL" };

const parseLocalDate = (value: string) => {
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
};

function matchesDue(task: Task, due: DueFilter): boolean {
  if (due === "ALL") return true;
  const dateStr = task.endDate || task.dueDate;
  if (!dateStr) return false;
  const date = parseLocalDate(dateStr);
  const today = startOfDay(new Date());
  if (due === "OVERDUE") return task.status !== "DONE" && isBefore(date, today);
  if (due === "TODAY") return isSameDay(date, today);
  return !isBefore(date, today) && !isBefore(addDays(today, 6), date);
}

// ponytail: filtra no navegador as até 100 tarefas que a API devolve; mover para o backend se paginar
export function applyTaskFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((t) =>
    (filters.priority === "ALL" || t.priority === filters.priority) &&
    (filters.categoryId === "ALL" || t.categoryId === filters.categoryId) &&
    (!filters.tag || (t.tags ?? []).includes(filters.tag)) &&
    matchesDue(t, filters.due)
  );
}

interface TaskFiltersBarProps {
  value: TaskFilters;
  onChange: (value: TaskFilters) => void;
  categories: Category[];
  tags: string[];
}

const selectClass =
  "px-2.5 py-1.5 bg-[var(--bg-2)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function TaskFiltersBar({ value, onChange, categories, tags }: TaskFiltersBarProps) {
  const isActive = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t("filters.byPriority")}
        value={value.priority}
        onChange={(e) => onChange({ ...value, priority: e.target.value as TaskFilters["priority"] })}
        className={selectClass}
      >
        <option value="ALL">{t("filters.allPriorities")}</option>
        <option value="HIGH">{t("priority.HIGH")}</option>
        <option value="MEDIUM">{t("priority.MEDIUM")}</option>
        <option value="LOW">{t("priority.LOW")}</option>
      </select>

      <select
        aria-label={t("filters.byCategory")}
        value={value.categoryId}
        onChange={(e) => onChange({ ...value, categoryId: e.target.value === "ALL" ? "ALL" : Number(e.target.value) })}
        className={selectClass}
      >
        <option value="ALL">{t("filters.allCategories")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>

      <select
        aria-label={t("filters.byTag")}
        value={value.tag}
        onChange={(e) => onChange({ ...value, tag: e.target.value })}
        className={selectClass}
      >
        <option value="">{t("filters.allTags")}</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>#{tag}</option>
        ))}
      </select>

      <select
        aria-label={t("filters.byDue")}
        value={value.due}
        onChange={(e) => onChange({ ...value, due: e.target.value as DueFilter })}
        className={selectClass}
      >
        <option value="ALL">{t("filters.anyDue")}</option>
        <option value="OVERDUE">{t("filters.overdue")}</option>
        <option value="TODAY">{t("filters.today")}</option>
        <option value="WEEK">{t("filters.week")}</option>
      </select>

      {isActive && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--bg-3)]"
        >
          <FilterX className="w-4 h-4" /> {t("filters.clear")}
        </button>
      )}
    </div>
  );
}
