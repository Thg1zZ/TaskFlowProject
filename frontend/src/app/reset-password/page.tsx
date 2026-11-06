"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useI18n } from "@/i18n/I18nProvider";
import { getApiErrorMessage } from "@/lib/apiError";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Se houver um token na URL (?token=xyz), usamos ele. Senão o usuário pode digitar.
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, t("recovery.invalidToken")));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text)]">{t("recovery.resetDone")}</h3>
        <p className="text-[var(--text-2)] text-sm">
          {t("recovery.resetDoneBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-lg text-center">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-2)]">{t("recovery.tokenLabel")}</label>
        <input
          type="text"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-2)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all font-mono"
          placeholder={t("recovery.tokenPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-2)]">{t("recovery.newPassword")}</label>
        <div className="relative">
          <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-2)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
            placeholder={t("recovery.newPasswordPlaceholder")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-medium shadow-lg hover:shadow-xl hover:opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("recovery.resetButton")}
      </button>

      <div className="pt-4 text-center">
        <Link 
          href="/login" 
          className="text-sm font-medium text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
        >
          {t("recovery.rememberedPassword")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md p-8 glass rounded-2xl border border-[var(--color-border)] shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-[var(--accent)]/20 blur-[80px] -z-10" />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">{t("recovery.resetTitle")}</h1>
          <p className="text-[var(--text-2)] text-sm mt-2">
            {t("recovery.resetSubtitle")}
          </p>
        </div>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
