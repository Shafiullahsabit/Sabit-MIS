"use client";

import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { modules } from "@/lib/navigation";

export function ModulePlaceholder({ moduleKey }) {
  const { t } = useLocale();
  const currentModule = modules.find((item) => item.key === moduleKey);
  const Icon = currentModule.icon;

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardContent className="px-6 py-12 text-center sm:px-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon size={25} strokeWidth={1.7} />
          </span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("common.workspaceModule")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {t(`navigation.${currentModule.key}`)}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("modules.description")}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <Construction size={13} />
            {t("common.comingSoon")}
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft size={14} />
                {t("common.backToDashboard")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
