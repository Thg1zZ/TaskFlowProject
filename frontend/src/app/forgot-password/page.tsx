"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await api.post("/auth/forgot-password", { email });
      // Sempre define como sucesso, independente de o email existir, por segurança (evita enumeration attack)
      setSuccess(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md p-8 glass rounded-2xl border border-[var(--color-border)] shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-[var(--accent)]/20 blur-[80px] -z-10" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Recuperar Senha</h1>
          <p className="text-[var(--text-2)] text-sm mt-2">
            Informe seu e-mail para receber as instruções de recuperação de acesso.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text)]">E-mail Enviado!</h3>
            <p className="text-[var(--text-2)] text-sm">
              Se o e-mail estiver cadastrado em nossa base, você receberá um link com o token para redefinir sua senha em instantes.
            </p>
            <Link 
              href="/login"
              className="mt-4 px-6 py-2 bg-[var(--bg-3)] hover:bg-[var(--color-border)] text-[var(--text)] font-medium rounded-lg transition-colors"
            >
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-2)]">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-2)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-medium shadow-lg hover:shadow-xl hover:opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Instruções"}
            </button>

            <div className="pt-4 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
