"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao efetuar login. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      {/* Background shapes for modern aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-3)] blur-[100px] opacity-50" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[var(--border-glow)] blur-[80px]" />
      </div>

      <div className="w-full max-w-md space-y-8 glass p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] relative">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
            Entre na sua conta do TaskFlow
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
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" htmlFor="password">
                  Senha
                </label>
                <a href="#" className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] py-2.5 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-[var(--color-muted-foreground)]">Não tem uma conta? </span>
          <Link href="/register" className="font-medium text-[var(--accent)] hover:underline">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
