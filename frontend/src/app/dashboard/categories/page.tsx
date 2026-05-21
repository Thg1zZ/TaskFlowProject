"use client";

import { useState } from "react";
import useSWR from "swr";
import { categoriesApi, Category } from "@/lib/api/categories";
import CategoryModal from "@/components/categories/CategoryModal";
import { Plus, Loader2, AlertCircle, Trash2, Edit2 } from "lucide-react";

const FIXED_CATEGORIES = ["Trabalho", "Pessoal", "Estudos", "Saúde", "Finanças", "Casa", "Lazer", "Outros"];

export default function CategoriesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Data fetching via SWR
  const { data: categories, error, isLoading, mutate } = useSWR<Category[]>("/categories", categoriesApi.getAll);

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta categoria? Tarefas associadas perderão o vínculo.")) {
      try {
        await categoriesApi.delete(id);
        mutate();
      } catch (err) {
        alert("Erro ao excluir a categoria.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Categorias</h1>
          <p className="text-[var(--text-2)] text-sm mt-1">Categorias padronizadas e personalizadas para organizar suas tarefas.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 rounded-[var(--radius-lg)] flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Erro ao carregar as categorias.</span>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : categories?.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center glass rounded-[var(--radius-lg)] border-dashed border-2 py-16">
          <div className="w-16 h-16 bg-[var(--bg-3)] rounded-full flex items-center justify-center mb-4 text-[var(--text-3)] text-3xl">
            📁
          </div>
          <h3 className="text-lg font-medium">Nenhuma categoria encontrada</h3>
          <p className="text-[var(--text-2)] text-sm mb-4">O sistema não possui categorias padronizadas cadastradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories?.map((cat) => (
            <div 
              key={cat.id}
              className="flex flex-col p-5 glass rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  {cat.icon}
                </div>
                
                {!FIXED_CATEGORIES.includes(cat.name) && (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button 
                      onClick={() => handleEdit(cat)}
                      className="p-1.5 text-[var(--text-2)] hover:text-[var(--accent)] rounded-md hover:bg-[var(--bg-3)] transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-[var(--text-2)] hover:text-[var(--red)] rounded-md hover:bg-[var(--red)]/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-lg text-[var(--text)]">{cat.name}</h3>
              
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-[var(--text-2)] font-mono">{cat.color}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
