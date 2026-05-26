"use client";

import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "error" | "success" | "info";
}

export default function AlertModal({ isOpen, onClose, title, message, type = "error" }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg)] w-full max-w-sm rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            {type === "error" && <AlertTriangle className="w-5 h-5 text-[var(--red)]" />}
            {type === "success" && <CheckCircle2 className="w-5 h-5 text-[var(--green)]" />}
            {type === "info" && <Info className="w-5 h-5 text-blue-500" />}
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
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] hover:opacity-90 transition-opacity"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
