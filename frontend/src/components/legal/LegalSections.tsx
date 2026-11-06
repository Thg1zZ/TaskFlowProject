"use client";

import { useI18n } from "@/i18n/I18nProvider";

const SECTION_COUNT = { terms: 3, privacy: 7 } as const;

/** Seções dos Termos ou da Política, lidas dos dicionários (legal.terms1Title, legal.privacy1Body...). */
export default function LegalSections({ kind }: { kind: keyof typeof SECTION_COUNT }) {
  const { t } = useI18n();
  return (
    <>
      {Array.from({ length: SECTION_COUNT[kind] }, (_, i) => i + 1).map((n) => (
        <div key={n} className="space-y-1">
          <p className="font-semibold text-[var(--text)]">{t(`legal.${kind}${n}Title`)}</p>
          <p>{t(`legal.${kind}${n}Body`)}</p>
        </div>
      ))}
    </>
  );
}
