"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale as DateLocale } from "date-fns";
import { enUS, ptBR as ptBRDates } from "date-fns/locale";
import ptBR, { Dictionary } from "./pt-BR";
import en from "./en";

export type Locale = "pt-BR" | "en";
type Vars = Record<string, string | number>;

const STORAGE_KEY = "locale";
const dictionaries: Record<Locale, Dictionary> = { "pt-BR": ptBR, en };
const dateLocales: Record<Locale, DateLocale> = { "pt-BR": ptBRDates, en: enUS };

/** Idioma salvo pelo usuário; sem escolha, segue o navegador (português ou inglês). */
export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
  } catch {
    // localStorage indisponível (modo privado, SSR): segue o navegador
  }
  if (typeof navigator === "undefined") return "pt-BR";
  return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>(
    (node, part) => (node as Record<string, unknown> | undefined)?.[part],
    dictionary
  );
  return typeof value === "string" ? value : undefined;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  dateLocale: DateLocale;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(getStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sem persistência: vale só para esta sessão
    }
    setLocaleState(next);
  }, []);

  const t = useCallback((key: string, vars?: Vars) => {
    const text = lookup(dictionaries[locale], key) ?? lookup(ptBR, key) ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match)) : text;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, dateLocale: dateLocales[locale] }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}
