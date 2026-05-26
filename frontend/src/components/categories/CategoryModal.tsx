"use client";

import { useEffect, useState } from "react";
import { Category, CategoryInput, categoriesApi } from "@/lib/api/categories";
import { X, Loader2, ChevronDown, Smile } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSuccess: () => void;
}

// ─── Biblioteca de Emojis Inline (zero dependências) ─────────────────────────
const EMOJI_CATEGORIES = [
  {
    label: "💼 Trabalho",
    emojis: ["💼", "📊", "📈", "📉", "🗂️", "📋", "✅", "🎯", "⚙️", "🔧", "💡", "🖥️", "📝", "📌", "🔑", "🏆", "💰", "📦", "🤝", "📣"],
  },
  {
    label: "📚 Estudos",
    emojis: ["📚", "🎓", "✏️", "📖", "🔬", "🧪", "🧠", "📐", "📏", "🖊️", "🏫", "💡", "🔭", "🧮", "📜", "🗒️", "🎒", "📓", "🖋️", "🔍"],
  },
  {
    label: "🏠 Casa & Vida",
    emojis: ["🏠", "🛋️", "🍳", "🧹", "🪴", "🛒", "🔑", "🪟", "🛏️", "🧺", "🪣", "🔌", "💡", "🚿", "🧴", "🪥", "🍽️", "🏡", "🛠️", "🗑️"],
  },
  {
    label: "❤️ Saúde",
    emojis: ["❤️", "🏃", "🧘", "💪", "🥗", "💊", "🩺", "🏋️", "🧬", "🩹", "🍎", "🥦", "💧", "😴", "🧘‍♀️", "🏊", "🚴", "🧠", "⚕️", "🌡️"],
  },
  {
    label: "💰 Finanças",
    emojis: ["💰", "💳", "📊", "🏦", "💵", "💹", "🪙", "📈", "🏧", "💸", "🧾", "📑", "💎", "🤑", "📉", "💴", "💶", "💷", "🔐", "🏪"],
  },
  {
    label: "🎉 Lazer",
    emojis: ["🎉", "🎮", "🎬", "🎵", "🏖️", "🎨", "📷", "🎭", "🎲", "⚽", "🎸", "🏕️", "🎪", "🎠", "🏄", "🎻", "🎯", "🪁", "🎳", "🎱"],
  },
  {
    label: "🌟 Símbolos",
    emojis: ["⭐", "🌟", "✨", "🔥", "💥", "🎯", "🚀", "⚡", "🌈", "💫", "🔮", "🎁", "🏅", "🥇", "🎖️", "🔔", "⚠️", "🚩", "🏷️", "📍"],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryModal({ isOpen, onClose, category, onSuccess }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  const [formData, setFormData] = useState<CategoryInput>({
    name: "",
    color: "#3b82f6",
    icon: "📁",
  });

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name,
          color: category.color || "#3b82f6",
          icon: category.icon || "📁",
        });
      } else {
        setFormData({ name: "", color: "#3b82f6", icon: "📁" });
      }
      setError("");
      setIsEmojiPickerOpen(false);
      setActiveCategoryIdx(0);
    }
  }, [isOpen, category]);

  if (!isOpen) return null;

  const handleEmojiSelect = (emoji: string) => {
    setFormData((prev) => ({ ...prev, icon: emoji }));
    setIsEmojiPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("O nome da categoria é obrigatório.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (category) {
        await categoriesApi.update(category.id, formData);
      } else {
        await categoriesApi.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar a categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[var(--bg)] w-full max-w-md rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">{category ? "Editar Categoria" : "Nova Categoria"}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--bg-3)] transition-colors text-[var(--color-muted-foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-[var(--radius)]">
              {error}
            </div>
          )}

          <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nome <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                placeholder="Ex: Trabalho, Estudos, Finanças..."
              />
            </div>

            {/* Cor + Emoji */}
            <div className="grid grid-cols-2 gap-4">
              {/* Seletor de Cor */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 p-1 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              {/* Seletor de Emoji */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ícone</label>
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm hover:bg-[var(--bg-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                >
                  <span className="text-2xl leading-none">{formData.icon}</span>
                  <div className="flex items-center gap-1 text-[var(--text-2)]">
                    <Smile className="w-3.5 h-3.5" />
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEmojiPickerOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* ── Emoji Picker Expandido ── */}
            {isEmojiPickerOpen && (
              <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--bg-2)] shadow-inner">
                {/* Abas de categorias */}
                <div className="flex overflow-x-auto border-b border-[var(--color-border)] bg-[var(--bg)]">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCategoryIdx(idx)}
                      title={cat.label}
                      className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCategoryIdx === idx
                          ? "border-b-2 border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5"
                          : "text-[var(--text-2)] hover:bg-[var(--bg-3)]"
                      }`}
                    >
                      {cat.label.split(" ")[0]}
                    </button>
                  ))}
                </div>

                {/* Grid de emojis */}
                <div className="p-3 grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
                  {EMOJI_CATEGORIES[activeCategoryIdx].emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      title={emoji}
                      className={`w-8 h-8 flex items-center justify-center text-xl rounded-md transition-all hover:bg-[var(--accent)]/10 hover:scale-110 ${
                        formData.icon === emoji ? "bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Pré-visualização do selecionado */}
                <div className="px-3 py-2 border-t border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--text-2)]">
                  <span>Selecionado:</span>
                  <span className="text-xl">{formData.icon}</span>
                  <span className="font-mono text-[var(--text-3)]">{formData.icon}</span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : category ? "Salvar" : "Criar Categoria"}
          </button>
        </div>
      </div>
    </div>
  );
}
