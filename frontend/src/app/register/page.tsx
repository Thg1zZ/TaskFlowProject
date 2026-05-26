"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Gera um nonce aleatório e o armazena para validação
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Nonce gerado uma vez por montagem do componente
  const nonceRef = useRef<string>(generateNonce());
  
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", { name, email, password });
      const userData = {
        id: res.data.userId,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
      };
      login(userData);
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
              <label className="text-sm font-medium" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="Mínimo 10 caracteres"
                minLength={10}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
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
                      id: res.data.id,
                      name: res.data.name,
                      email: res.data.email,
                      role: res.data.role
                    });
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
    </GoogleOAuthProvider>
  );
}
