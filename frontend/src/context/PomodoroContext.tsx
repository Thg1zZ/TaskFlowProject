"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  soundEnabled: true,
};

interface PomodoroContextType {
  mode: PomodoroMode;
  timeLeft: number;
  isActive: boolean;
  settings: PomodoroSettings;
  setMode: (mode: PomodoroMode) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  updateSettings: (newSettings: PomodoroSettings) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PomodoroMode>("focus");
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Carrega as configurações e o estado anterior do localStorage (se houver)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("pomodoro_settings");
      let currentSettings = DEFAULT_SETTINGS;
      if (savedSettings) {
        try {
          currentSettings = JSON.parse(savedSettings);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSettings(currentSettings);
        } catch (e) {
          console.error("Erro ao analisar configurações de Pomodoro:", e);
        }
      }

      const savedMode = localStorage.getItem("pomodoro_mode") as PomodoroMode;
      const finalMode = savedMode || "focus";
      if (savedMode) setModeState(savedMode);

      const savedTime = localStorage.getItem("pomodoro_time_left");
      const savedIsActive = localStorage.getItem("pomodoro_is_active") === "true";
      const savedTimestamp = localStorage.getItem("pomodoro_timestamp");

      if (savedTime && savedTimestamp) {
        const remainingTime = Number(savedTime);
        if (savedIsActive) {
          const elapsedSeconds = Math.floor((Date.now() - Number(savedTimestamp)) / 1000);
          const computedTime = remainingTime - elapsedSeconds;
          if (computedTime > 0) {
            setTimeLeft(computedTime);
            setIsActive(true);
          } else {
            setTimeLeft(0);
            setIsActive(false);
          }
        } else {
          setTimeLeft(remainingTime);
        }
      } else {
        setTimeLeft(currentSettings[finalMode] * 60);
      }
    }
  }, []);

  // 2. Sempre que as configurações mudam, salva no localStorage e atualiza estado
  const updateSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem("pomodoro_settings", JSON.stringify(newSettings));
    
    // Se o timer não estiver ativo, reseta o tempo restante para o novo limite correspondente ao modo ativo
    if (!isActive) {
      setTimeLeft(newSettings[mode] * 60);
    }
  };

  // 3. Função para trocar de modo
  const setMode = (newMode: PomodoroMode) => {
    setModeState(newMode);
    localStorage.setItem("pomodoro_mode", newMode);
    setIsActive(false);
    setTimeLeft(settings[newMode] * 60);
    localStorage.setItem("pomodoro_is_active", "false");
    localStorage.setItem("pomodoro_time_left", String(settings[newMode] * 60));
  };

  // 4. Timer Interval que roda globalmente no escopo do provedor
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const nextVal = prev - 1;
          localStorage.setItem("pomodoro_time_left", String(nextVal));
          localStorage.setItem("pomodoro_timestamp", String(Date.now()));
          return nextVal;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsActive(false);
      localStorage.setItem("pomodoro_is_active", "false");
      
      // Toca áudio de alerta se habilitado
      if (settings.soundEnabled && typeof window !== "undefined") {
        try {
          const audio = new Audio("/complete.ogg");
          audio.volume = 0.5;
          audio.play().catch((e) => console.log("Erro de autoplay no Pomodoro:", e));
        } catch (e) {
          console.error("Falha ao tocar áudio de finalização do Pomodoro:", e);
        }
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, settings.soundEnabled]);

  // 5. Funções de controle do Timer
  const toggleTimer = () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    localStorage.setItem("pomodoro_is_active", String(nextActive));
    localStorage.setItem("pomodoro_timestamp", String(Date.now()));
    localStorage.setItem("pomodoro_time_left", String(timeLeft));
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode] * 60);
    localStorage.setItem("pomodoro_is_active", "false");
    localStorage.setItem("pomodoro_time_left", String(settings[mode] * 60));
  };

  return (
    <PomodoroContext.Provider value={{
      mode,
      timeLeft,
      isActive,
      settings,
      setMode,
      toggleTimer,
      resetTimer,
      updateSettings
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error("usePomodoro deve ser usado dentro de um PomodoroProvider");
  }
  return context;
}
