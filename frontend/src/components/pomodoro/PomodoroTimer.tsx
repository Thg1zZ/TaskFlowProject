"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Settings2, X } from "lucide-react";
import clsx from "clsx";

type Mode = "focus" | "shortBreak" | "longBreak";

const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  soundEnabled: true,
};

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timer
  useEffect(() => {
    setTimeLeft(settings[mode] * 60);
    setIsActive(false);
  }, [mode, settings]);

  // Timer interval
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Dispara um áudio se estiver habilitado
      if (settings.soundEnabled && typeof window !== "undefined") {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.volume = 0.5;
        audio.play().catch(() => {}); // catch para navegadores que bloqueiam autoplay
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode] * 60);
  };

  const saveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSettings({
      focus: Number(formData.get("focus")),
      shortBreak: Number(formData.get("shortBreak")),
      longBreak: Number(formData.get("longBreak")),
      soundEnabled: formData.get("soundEnabled") === "on",
    });
    setIsSettingsOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calcula o progresso do circulo (SVG)
  const totalTime = settings[mode] * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
      
      {/* Settings Button */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute bottom-4 right-4 p-2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] rounded-full transition-colors z-10"
      >
        <Settings2 className="w-5 h-5" />
      </button>

      {/* Settings Modal Layer */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-[var(--bg)]/90 backdrop-blur-sm z-20 flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Configurações</h3>
            <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-md hover:bg-[var(--bg-3)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={saveSettings} className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tempo de Foco (min)</label>
              <input type="number" name="focus" defaultValue={settings.focus} min="1" max="120" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pausa Curta (min)</label>
              <input type="number" name="shortBreak" defaultValue={settings.shortBreak} min="1" max="30" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pausa Longa (min)</label>
              <input type="number" name="longBreak" defaultValue={settings.longBreak} min="1" max="60" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)]" />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                name="soundEnabled" 
                id="soundEnabled"
                defaultChecked={settings.soundEnabled}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg)]" 
              />
              <label htmlFor="soundEnabled" className="text-sm font-medium cursor-pointer">
                Tocar som ao finalizar
              </label>
            </div>
            
            <div className="mt-auto pt-4">
              <button type="submit" className="w-full py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[var(--radius)] font-medium">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex bg-[var(--bg-3)] p-1 rounded-full mb-8 z-10">
        {(["focus", "shortBreak", "longBreak"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setIsActive(false); }}
            className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              mode === m 
                ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" 
                : "text-[var(--color-muted-foreground)] hover:text-[var(--text)]"
            )}
          >
            {m === "focus" ? "Foco" : m === "shortBreak" ? "Pausa Curta" : "Pausa Longa"}
          </button>
        ))}
      </div>

      {/* Circular Timer */}
      <div className="relative flex items-center justify-center w-64 h-64 mb-8">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260">
          {/* Background circle */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke="var(--bg-3)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: "stroke-dashoffset 1s linear"
            }}
          />
        </svg>
        <div className="z-10 flex flex-col items-center">
          <span className="text-6xl font-bold tracking-tighter text-[var(--text)]">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-[var(--color-muted-foreground)] mt-2 uppercase tracking-widest">
            {mode === "focus" ? "Tempo de Foco" : mode === "shortBreak" ? "Relaxar" : "Descansar"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 z-10">
        <button 
          onClick={toggleTimer}
          className="w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center shadow-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95"
        >
          {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
        <button 
          onClick={resetTimer}
          className="w-12 h-12 rounded-full bg-[var(--bg-3)] text-[var(--text-2)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
