"use client";

import { useMemo } from 'react';
import { TaskParticipant } from '@/lib/api/collaboration';

interface ParticipantAvatarsProps {
  participants?: TaskParticipant[];
  maxCount?: number;
}

export default function ParticipantAvatars({ participants = [], maxCount = 3 }: ParticipantAvatarsProps) {
  if (participants.length === 0) return null;

  const displayParticipants = participants.slice(0, maxCount);
  const remaining = participants.length - maxCount;

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {displayParticipants.map((p) => {
        const name = p.user?.name || (p as any).userName || "Usuário";
        const role = p.role || "VIEWER";
        const displayName = name.substring(0, 2).toUpperCase();

        return (
          <div 
            key={p.id}
            title={`${name} (${role})`}
            className="inline-flex h-6 w-6 sm:h-8 sm:w-8 rounded-full ring-2 ring-[var(--bg)] bg-[var(--accent)] text-[var(--accent-foreground)] items-center justify-center text-[10px] sm:text-xs font-bold"
          >
            {displayName}
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 rounded-full ring-2 ring-[var(--bg)] bg-[var(--bg-3)] text-[var(--color-muted-foreground)] flex items-center justify-center text-[10px] sm:text-xs font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}
