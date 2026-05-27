"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collaborationApi } from "@/lib/api/collaboration";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function JoinTaskPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Se a autenticação ainda está carregando, esperamos.
    if (authLoading) return;

    // Se não estiver logado, redireciona para login com o callbackUrl
    if (!user) {
      router.replace(`/login?callbackUrl=/join/${token}`);
      return;
    }

    // Se estiver logado, tenta entrar na tarefa
    const joinTask = async () => {
      try {
        await collaborationApi.joinTask(token);
        setStatus("success");
        toast.success("Você ingressou na tarefa com sucesso!");
        
        // Redireciona para o dashboard após breve sucesso
        setTimeout(() => {
          router.replace("/dashboard/tasks");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(
          err.response?.data?.message || 
          "Ocorreu um erro ao processar o convite. O link pode ser inválido, expirado, ou você não tem permissão."
        );
      }
    };

    joinTask();
  }, [user, authLoading, token, router]);

  if (status === "loading" || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-[var(--text-2)] font-medium">Verificando convite e preparando o acesso...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-[var(--bg)] w-full max-w-md p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--color-border)] text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[var(--green)]/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[var(--green)]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text)]">Convite Aceito!</h2>
          <p className="text-[var(--text-2)]">Você agora é um participante desta tarefa.</p>
          <p className="text-sm text-[var(--color-muted-foreground)] animate-pulse">
            Redirecionando para o seu Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-[var(--bg)] w-full max-w-md p-8 rounded-[var(--radius-lg)] shadow-[var(--shadow)] border border-[var(--red)]/20 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[var(--red)]/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-[var(--red)]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text)]">Falha no Convite</h2>
        <p className="text-[var(--text-2)] bg-[var(--red)]/5 p-4 rounded-[var(--radius)] text-sm border border-[var(--red)]/10">
          {errorMessage}
        </p>
        <Link 
          href="/dashboard" 
          className="inline-block bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-2.5 rounded-[var(--radius)] font-medium hover:opacity-90 transition-opacity w-full"
        >
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
}
