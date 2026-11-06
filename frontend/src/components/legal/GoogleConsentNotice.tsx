"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

/** [LGPD art. 9] Quem cria a conta pelo Google vê e aceita os Termos e a Política antes de continuar. */
export default function GoogleConsentNotice() {
  const { t } = useI18n();
  return (
    <p className="text-center text-xs text-[var(--color-muted-foreground)] mt-3">
      {t("auth.googleNoticePrefix")}{" "}
      <Link href="/privacidade" className="underline hover:text-[var(--accent)]">
        {t("auth.googleNoticeLink")}
      </Link>
      .
    </p>
  );
}
