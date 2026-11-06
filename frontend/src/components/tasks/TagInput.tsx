"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}

export function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
      #{tag}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={t("tags.remove", { tag })} className="hover:text-[var(--red)]">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

/** Etiquetas livres: Enter ou vírgula adiciona, Backspace no campo vazio remove a última. */
export default function TagInput({ value, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const { t } = useI18n();

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, "").trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
      {value.map((tag) => (
        <TagChip key={tag} tag={tag} onRemove={() => onChange(value.filter((t) => t !== tag))} />
      ))}
      {value.length < MAX_TAGS && (
        <input
          type="text"
          list={listId}
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          onChange={(e) => setDraft(e.target.value.replace(",", ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : t("tags.placeholder")}
          aria-label={t("taskModal.tags")}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none py-0.5"
        />
      )}
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
