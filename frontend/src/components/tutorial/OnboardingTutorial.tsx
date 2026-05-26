"use client";

import { useEffect, useState } from "react";
import { Joyride, Step, STATUS } from "react-joyride";
import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/lib/api/users";
import { useTheme } from "next-themes";

export default function OnboardingTutorial() {
  const { user, login } = useAuth();
  const { theme } = useTheme();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (user && user.hasCompletedOnboarding === false) {
      setRun(true);
    }
  }, [user]);

  const steps: Step[] = [
    {
      target: "body",
      content: "Bem-vindo ao TaskFlow! Vamos fazer um tour rápido para você conhecer a plataforma.",
      placement: "center",
    },
    {
      target: "aside nav",
      content: "Aqui no menu lateral você encontra as principais ferramentas para gerenciar suas tarefas e categorias.",
      placement: "right",
    },
    {
      target: "header button:last-child",
      content: "Use este botão para criar rapidamente uma nova tarefa de qualquer lugar da plataforma.",
      placement: "bottom-end",
    },
    {
      target: ".lucide-bell",
      content: "Fique de olho nas notificações para não perder prazos ou alertas do sistema.",
      placement: "bottom",
    },
  ];

  const handleJoyrideCallback = async (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      try {
        await usersApi.completeOnboarding();
        if (user) {
          login({ ...user, hasCompletedOnboarding: true });
        }
      } catch (err) {
        console.error("Erro ao salvar status de onboarding", err);
      }
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular Tour',
      }}
    />
  );
}
