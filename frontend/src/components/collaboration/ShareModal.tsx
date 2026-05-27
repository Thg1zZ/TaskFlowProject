"use client";

import { useState, useEffect } from 'react';
import { X, Copy, Trash2, Users, Shield, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collaborationApi, TaskParticipant } from '@/lib/api/collaboration';

interface ShareModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  privacyMode: 'PRIVATE' | 'PUBLIC';
  onPrivacyChange: (mode: 'PRIVATE' | 'PUBLIC') => void;
}

export default function ShareModal({ taskId, isOpen, onClose, privacyMode, onPrivacyChange }: ShareModalProps) {
  const [participants, setParticipants] = useState<TaskParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkRole, setLinkRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [generatedLink, setGeneratedLink] = useState('');

  const loadParticipants = async () => {
    try {
      const data = await collaborationApi.getParticipants(taskId);
      setParticipants(data);
    } catch (e) {
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
      setGeneratedLink('');
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    try {
      const linkData = await collaborationApi.generateShareLink(taskId, linkRole);
      // O linkData.token é o UUID. Montamos a URL do frontend
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}/join/${linkData.token}`;
      setGeneratedLink(fullUrl);
      toast.success('Link gerado com sucesso!');
    } catch (e) {
      toast.error('Erro ao gerar link de compartilhamento.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copiado!');
  };

  const handleRemove = async (userId: number) => {
    try {
      await collaborationApi.removeParticipant(taskId, userId);
      toast.success('Participante removido');
      loadParticipants();
    } catch (e) {
      toast.error('Erro ao remover participante');
    }
  };

  const togglePrivacy = async () => {
    const newMode = privacyMode === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE';
    try {
      await collaborationApi.updatePrivacy(taskId, newMode);
      onPrivacyChange(newMode);
      toast.success(`Tarefa agora é ${newMode === 'PUBLIC' ? 'Pública' : 'Privada'}`);
    } catch (e) {
      toast.error('Erro ao atualizar privacidade');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg)] border border-[var(--color-border)] w-full max-w-md rounded-[var(--radius-lg)] shadow-xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--bg-2)]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text)]">Compartilhar Tarefa</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-3)] text-[var(--color-muted-foreground)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Privacy Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--bg-3)]">
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${privacyMode === 'PUBLIC' ? 'text-[var(--green)]' : 'text-[var(--color-muted-foreground)]'}`} />
              <div>
                <p className="text-sm font-medium">Acesso Global</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {privacyMode === 'PUBLIC' ? 'Qualquer um com a URL pode ver.' : 'Apenas participantes explícitos.'}
                </p>
              </div>
            </div>
            <button 
              onClick={togglePrivacy}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--color-border)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors"
            >
              Mudar
            </button>
          </div>

          {/* Generate Link */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-2)]">Convidar via Link</h4>
            <div className="flex gap-2">
              <select 
                value={linkRole} 
                onChange={e => setLinkRole(e.target.value as any)}
                className="text-sm rounded-md border border-[var(--color-border)] bg-[var(--bg)] p-2 focus:ring-1 focus:ring-[var(--accent)] outline-none"
              >
                <option value="VIEWER">Visualizador</option>
                <option value="EDITOR">Editor</option>
              </select>
              <button 
                onClick={handleGenerateLink}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium py-2 hover:opacity-90 transition-opacity"
              >
                <LinkIcon className="w-4 h-4" />
                Gerar Link
              </button>
            </div>
            
            {generatedLink && (
              <div className="flex items-center gap-2 p-2 mt-2 bg-[var(--bg-3)] border border-[var(--color-border)] rounded-md animate-in fade-in">
                <input 
                  type="text" 
                  readOnly 
                  value={generatedLink} 
                  className="flex-1 bg-transparent border-none text-xs text-[var(--color-muted-foreground)] outline-none"
                />
                <button onClick={copyToClipboard} className="p-1 hover:text-[var(--text)] text-[var(--color-muted-foreground)] transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-2)]">Participantes da Tarefa</h4>
            {loading ? (
              <div className="flex justify-center p-4">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent)]" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] italic text-center p-4">Nenhum participante além de você.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {participants.map(p => (
                  <li key={p.id} className="flex items-center justify-between p-2 rounded border border-[var(--color-border)] hover:bg-[var(--bg-3)] transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold text-xs">
                        {p.user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate w-24 sm:w-32">{p.user.name}</span>
                        <span className="text-[10px] text-[var(--color-muted-foreground)]">{p.role}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemove(p.user.id)}
                      className="p-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 rounded transition-colors"
                      title="Remover acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
