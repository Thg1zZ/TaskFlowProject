"use client";

import { Languages } from "lucide-react";
import { Locale, useI18n } from "@/i18n/I18nProvider";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "pt-BR", label: "PT" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="inline-flex items-center gap-1 text-sm text-[var(--text-2)]">
      <Languages className="w-4 h-4" aria-hidden />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("common.language")}
        className="bg-transparent text-sm font-medium cursor-pointer outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
