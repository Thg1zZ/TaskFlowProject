"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, X } from "lucide-react";
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

function RegisterContent({ clientId }: { clientId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const passwordRequirements = {
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordStrong = Object.values(passwordRequirements).every(Boolean);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email !== confirmEmail) {
      setError(t("auth.emailsMismatch"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }

    if (!isPasswordStrong) {
      setError(t("auth.weakPassword"));
      return;
    }

    if (!acceptedTerms) {
      setError(t("auth.acceptTerms"));
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", { name, email, password, acceptedTerms: true });
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
      setError(getApiErrorMessage(err, t("auth.registerError")));
    } finally {
      setLoading(false);
    }
  };

  const TermsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col max-h-[80vh] shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg">{t("legal.termsTitle")}</h3>
          <button onClick={() => setIsTermsModalOpen(false)} className="p-1 rounded-full hover:bg-[var(--bg-3)]" aria-label={t("common.close")}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-1">
              <p className="font-semibold text-[var(--text)]">{t(`legal.terms${n}Title`)}</p>
              <p>{t(`legal.terms${n}Body`)}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end">
          <button onClick={() => setIsTermsModalOpen(false)} className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium">
            {t("common.understood")}
          </button>
        </div>
      </div>
    </div>
  );

  const PrivacyModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col max-h-[80vh] shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg">{t("legal.privacyTitle")}</h3>
          <button onClick={() => setIsPrivacyModalOpen(false)} className="p-1 rounded-full hover:bg-[var(--bg-3)]" aria-label={t("common.close")}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="space-y-1">
              <p className="font-semibold text-[var(--text)]">{t(`legal.privacy${n}Title`)}</p>
              <p>{t(`legal.privacy${n}Body`)}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end">
          <button onClick={() => setIsPrivacyModalOpen(false)} className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium">
            {t("common.understood")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <GoogleOAuthProvider clientId={clientId} locale={locale}>
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      {/* Background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-3)] blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-md space-y-8 glass p-6 sm:p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] relative">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t("auth.registerTitle")}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
            {t("auth.registerSubtitle")}
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-[var(--red)] bg-[var(--bg-3)] border border-[var(--red)]/20 rounded-[var(--radius)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                {t("profile.fullName")}
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder={t("auth.namePlaceholder")}
              />
            </div>
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
              <label className="text-sm font-medium" htmlFor="confirmEmail">
                {t("auth.confirmEmail")}
              </label>
              <input
                id="confirmEmail"
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder={t("auth.confirmEmailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder={t("auth.createPasswordPlaceholder")}
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
              
              {/* Requisitos de senha forte dinâmicos */}
              {password && (
                <div className="p-3 bg-[var(--bg-3)] border border-[var(--color-border)] rounded-[var(--radius)] space-y-1.5 text-xs text-left">
                  <p className="font-semibold text-[var(--text-2)] mb-1">{t("auth.requirementsTitle")}</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.minLength ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t("auth.reqMinLength")}
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasUpper ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t("auth.reqUpper")}
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasLower ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t("auth.reqLower")}
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasNumber ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t("auth.reqNumber")}
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasSpecial ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t("auth.reqSpecial")}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="acceptedTerms"
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-[var(--bg)] bg-[var(--bg-2)] cursor-pointer mt-1"
              />
              <label htmlFor="acceptedTerms" className="text-xs text-[var(--text-2)] leading-relaxed cursor-pointer select-none">
                {t("auth.acceptPrefix")}{" "}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  {t("legal.termsTitle")}
                </button>{" "}
                {t("auth.acceptAnd")}{" "}
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  {t("legal.privacyTitle")}
                </button>
                .
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] py-2.5 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.registerTitle")}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-[var(--color-muted-foreground)]">{t("auth.haveAccount")} </span>
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            {t("auth.signIn")}
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
              text="signup_with"
              shape="rectangular"
            />
          )}
        </div>
      </div>
    </div>
    {/* eslint-disable-next-line react-hooks/static-components */}
    {isTermsModalOpen && <TermsModal />}
    {/* eslint-disable-next-line react-hooks/static-components */}
    {isPrivacyModalOpen && <PrivacyModal />}
    </GoogleOAuthProvider>
  );
}

export default function RegisterClient({ clientId }: { clientId: string }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <RegisterContent clientId={clientId} />
    </Suspense>
  );
}
