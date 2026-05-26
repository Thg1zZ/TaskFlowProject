"use client";

import { X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg)] w-full max-w-sm rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            {isDestructive && <AlertTriangle className="w-5 h-5 text-[var(--red)]" />}
            <h2 className="text-base font-bold text-[var(--text)]">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--bg-3)] transition-colors text-[var(--color-muted-foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-[var(--text-2)] leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-opacity shadow-sm disabled:opacity-50 ${
              isDestructive 
                ? "bg-[var(--red)] text-white hover:opacity-90" 
                : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
