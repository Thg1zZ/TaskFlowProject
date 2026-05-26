import React, { useState, useEffect } from "react";
import { X, RotateCcw, Palette } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/context/AuthContext";

interface ColorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const defaultColors = {
  total: "var(--accent)",
  todo: "var(--text-3)",
  inProgress: "var(--yellow)",
  done: "var(--green)"
};

export default function ColorSettingsModal({ isOpen, onClose }: ColorSettingsModalProps) {
  const { user, updateContextUser } = useAuth();
  const [colors, setColors] = useState(defaultColors);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.themePreferences) {
      try {
        const parsed = JSON.parse(user.themePreferences);
        setColors({ ...defaultColors, ...parsed });
      } catch (e) {
        console.error("Erro ao fazer parse das preferências", e);
      }
    }
  }, [user]);

  if (!isOpen) return null;

  const handleChange = (key: keyof typeof defaultColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const prefsString = JSON.stringify(colors);
      await usersApi.updatePreferences(prefsString);
      if (updateContextUser) {
        updateContextUser({ themePreferences: prefsString });
      }
      onClose();
    } catch (e) {
      console.error("Erro ao salvar cores", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setColors(defaultColors);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg)] border border-[var(--color-border)] w-full max-w-md rounded-[var(--radius-lg)] shadow-xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--bg-2)]">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text)]">Personalizar Cores</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-3)] text-[var(--color-muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
            Altere as cores dos cards de status do painel. Clique no botão de cor para escolher.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-2)]">Total de Tarefas</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={colors.total.startsWith('var') ? '#6366f1' : colors.total} 
                  onChange={(e) => handleChange('total', e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-3)]">{colors.total}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-2)]">A Fazer</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={colors.todo.startsWith('var') ? '#9ca3af' : colors.todo} 
                  onChange={(e) => handleChange('todo', e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-3)]">{colors.todo}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-2)]">Em Progresso</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={colors.inProgress.startsWith('var') ? '#eab308' : colors.inProgress} 
                  onChange={(e) => handleChange('inProgress', e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-3)]">{colors.inProgress}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-2)]">Concluídas</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={colors.done.startsWith('var') ? '#22c55e' : colors.done} 
                  onChange={(e) => handleChange('done', e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-3)]">{colors.done}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex items-center justify-between">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Padrão
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-[var(--bg-3)] hover:bg-[var(--color-border)] text-[var(--text)] rounded-[var(--radius)] transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-[var(--accent)] hover:opacity-90 text-white rounded-[var(--radius)] transition-opacity disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Cores"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
