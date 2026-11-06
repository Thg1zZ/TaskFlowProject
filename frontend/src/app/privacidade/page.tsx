"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LegalSections from "@/components/legal/LegalSections";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

/** [LGPD art. 9] Termos e Política acessíveis a qualquer pessoa, com ou sem conta. */
export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>

      <main className="mx-auto w-full max-w-2xl p-8 glass rounded-2xl border border-[var(--color-border)] shadow-xl space-y-8">
        <header className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">{t("legal.pageTitle")}</h1>
          <p className="text-xs text-[var(--color-muted-foreground)]">{t("legal.updated")}</p>
        </header>

        <section id="termos" className="space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t("legal.termsTitle")}</h2>
          <LegalSections kind="terms" />
        </section>

        <section id="privacidade" className="space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t("legal.privacyTitle")}</h2>
          <LegalSections kind="privacy" />
        </section>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("legal.backToApp")}
        </Link>
      </main>
    </div>
  );
}
