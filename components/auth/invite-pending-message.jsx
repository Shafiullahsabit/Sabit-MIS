"use client";

import { useLocale } from "@/components/providers/locale-provider";

export function InvitePendingMessage() {
  const { t } = useLocale();

  return (
    <div role="status">
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">
        {t("auth.invitePendingTitle")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("auth.invitePending")}
      </p>
    </div>
  );
}
