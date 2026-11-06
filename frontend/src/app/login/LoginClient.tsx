"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useI18n } from '@/i18n/I18nProvider';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { getApiErrorMessage } from '@/lib/apiError';

// Gera um nonce aleatório e o armazena para validação
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function LoginContent({ clientId }: { clientId: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Nonce gerado uma vez por montagem do componente
  const nonceRef = useRef<string>(generateNonce());
  
  const { login } = useAuth();
  const { t, locale } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const userData = {
        id: res.data.userId,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        hasCompletedOnboarding: res.data.hasCompletedOnboarding,
        receiveNotifications: res.data.receiveNotifications,
        themePreferences: res.data.themePreferences,
      };
      login(userData, callbackUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.loginError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId} locale={locale}>
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      {/* Background shapes for modern aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-3)] blur-[100px] opacity-50" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[var(--border-glow)] blur-[80px]" />
      </div>

      <div className="w-full max-w-md space-y-8 glass p-6 sm:p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] relative">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t("auth.loginTitle")}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-[var(--red)] bg-[var(--bg-3)] border border-[var(--red)]/20 rounded-[var(--radius)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" htmlFor="password">
                  {t("auth.password")}
                </label>
                <Link href="/forgot-password" className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] py-2.5 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signInButton")}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-[var(--color-muted-foreground)]">{t("auth.noAccount")} </span>
          <Link href="/register" className="font-medium text-[var(--accent)] hover:underline">
            {t("auth.registerTitle")}
          </Link>
        </div>

        <div className="flex items-center justify-center pt-4 border-t border-[var(--color-border)] mt-6 min-h-[40px]">
          {mounted && (
            <GoogleLogin
              // eslint-disable-next-line react-hooks/refs
              nonce={nonceRef.current}
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  setLoading(true);
                  setError("");
                  try {
                    const res = await api.post("/auth/google", {
                      idToken: credentialResponse.credential,
                      nonce: nonceRef.current,
                    });
                    login({
                      id: res.data.userId || res.data.id,
                      name: res.data.name,
                      email: res.data.email,
                      role: res.data.role,
                      hasCompletedOnboarding: res.data.hasCompletedOnboarding,
                      receiveNotifications: res.data.receiveNotifications,
                      themePreferences: res.data.themePreferences,
                    }, callbackUrl);
                  } catch {
                    setError(t("auth.googleError"));
                    setLoading(false);
                  }
                }
              }}
              onError={() => {
                setError(t("auth.googleFailed"));
              }}
              useOneTap
              theme="outline"
              text="signin_with"
              shape="rectangular"
            />
          )}
        </div>
      </div>
    </div>
    </GoogleOAuthProvider>
  );
}

export default function LoginClient({ clientId }: { clientId: string }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <LoginContent clientId={clientId} />
    </Suspense>
  );
}
