"use client";

import { useEffect, useState } from "react";
import { Joyride, Step, STATUS } from "react-joyride";
import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/lib/api/users";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n/I18nProvider";

export default function OnboardingTutorial() {
  const { user, login } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = useTheme();
  const [run, setRun] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (user && user.hasCompletedOnboarding === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(true);
    }
  }, [user]);

  const steps: Step[] = [
    {
      target: "body",
      content: t("tour.welcome"),
      placement: "center",
    },
    {
      target: "aside nav",
      content: t("tour.sidebar"),
      placement: "right",
    },
    {
      target: "header button.bg-\\[var\\(--accent\\)\\]",
      content: t("tour.newTask"),
      placement: "bottom-end",
    },
    {
      target: ".lucide-bell",
      content: t("tour.notifications"),
      placement: "bottom",
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        back: t("tour.back"),
        close: t("common.close"),
        last: t("tour.finish"),
        next: t("tour.next"),
        skip: t("tour.skip"),
      }}
    />
  );
}
