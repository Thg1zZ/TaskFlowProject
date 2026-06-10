"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Gera um nonce aleatório e o armazena para validação
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function RegisterContent() {
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
      setError("Os emails fornecidos não coincidem.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas fornecidas não coincidem.");
      return;
    }

    if (!isPasswordStrong) {
      setError("A senha não atende a todos os requisitos de segurança.");
      return;
    }

    if (!acceptedTerms) {
      setError("Você deve aceitar os termos de uso e a política de privacidade.");
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        setError(err.response.data.errors[0].defaultMessage);
      } else {
        setError(err.response?.data?.message || "Erro ao criar conta. Verifique os dados fornecidos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const TermsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col max-h-[80vh] shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg">Termos de Uso</h3>
          <button onClick={() => setIsTermsModalOpen(false)} className="p-1 rounded-full hover:bg-[var(--bg-3)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          <p className="font-semibold text-[var(--text)]">1. Aceitação dos Termos</p>
          <p>Ao se cadastrar no TaskFlow, você concorda em cumprir e estar totalmente vinculado aos seguintes Termos de Serviço.</p>
          <p className="font-semibold text-[var(--text)]">2. Uso do Serviço</p>
          <p>Você concorda em usar o TaskFlow apenas para fins legítimos de gerenciamento pessoal de tarefas. O uso indevido de nossos sistemas ou tentativas de burla de segurança resultará na imediata exclusão da conta.</p>
          <p className="font-semibold text-[var(--text)]">3. Segurança da Conta</p>
          <p>Você é responsável por salvaguardar sua senha de acesso e quaisquer atividades realizadas sob sua conta.</p>
        </div>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end">
          <button onClick={() => setIsTermsModalOpen(false)} className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  const PrivacyModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg)] w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col max-h-[80vh] shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg">Política de Privacidade</h3>
          <button onClick={() => setIsPrivacyModalOpen(false)} className="p-1 rounded-full hover:bg-[var(--bg-3)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
          <p className="font-semibold text-[var(--text)]">1. Coleta de Informações</p>
          <p>Coletamos seu nome e e-mail com a única finalidade de autenticação e identificação das suas tarefas em nosso sistema. Nenhuma informação pessoal é compartilhada com terceiros.</p>
          <p className="font-semibold text-[var(--text)]">2. Segurança de Dados</p>
          <p>Empregamos criptografia de ponta e hash de senha por BCrypt no backend para assegurar que seus dados estejam protegidos contra acessos não autorizados.</p>
          <p className="font-semibold text-[var(--text)]">3. Seus Direitos (LGPD)</p>
          <p>Você tem o direito de, a qualquer momento, exportar suas tarefas ou excluir permanentemente a sua conta de nossos servidores através do painel de controle do perfil.</p>
        </div>
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--bg-2)] flex justify-end">
          <button onClick={() => setIsPrivacyModalOpen(false)} className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      {/* Background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-3)] blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-md space-y-8 glass p-6 sm:p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] relative">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Criar conta</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
            Comece a organizar suas tarefas hoje mesmo
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
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="Seu nome"
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
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmEmail">
                Confirmar Email
              </label>
              <input
                id="confirmEmail"
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="Confirme seu email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder="Crie uma senha forte"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Requisitos de senha forte dinâmicos */}
              {password && (
                <div className="p-3 bg-[var(--bg-3)] border border-[var(--color-border)] rounded-[var(--radius)] space-y-1.5 text-xs text-left">
                  <p className="font-semibold text-[var(--text-2)] mb-1">Requisitos para uma senha forte:</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.minLength ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Mínimo de 10 caracteres
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasUpper ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Pelo menos uma letra maiúscula (A-Z)
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasLower ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Pelo menos uma letra minúscula (a-z)
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasNumber ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Pelo menos um número (0-9)
                    </li>
                    <li className={`flex items-center gap-1.5 ${passwordRequirements.hasSpecial ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Pelo menos um caractere especial (ex: @, $, !, %, *)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder="Confirme sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
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
                Eu li e aceito os{" "}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  Termos de Uso
                </button>{" "}
                e a{" "}
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  Política de Privacidade
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-[var(--color-muted-foreground)]">Já tem uma conta? </span>
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Fazer login
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
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
                  } catch (err: any) {
                    setError("Erro na autenticação com o Google.");
                    setLoading(false);
                  }
                }
              }}
              onError={() => {
                setError("Login com o Google falhou.");
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
