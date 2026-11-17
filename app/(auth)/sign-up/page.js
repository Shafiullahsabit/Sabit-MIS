"use client";

import Link from "next/link";
import { ArrowLeft, MailPlus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const { t } = useLocale();

  return (
    <AuthPageShell>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <MailPlus size={20} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
        {t("auth.signUpTitle")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("auth.inviteOnlyDescription")}
      </p>
      <Button asChild className="mt-6 w-full" variant="outline">
        <Link href="/sign-in">
          <ArrowLeft className="rtl:rotate-180" size={15} />
          {t("auth.backToSignIn")}
        </Link>
      </Button>
    </AuthPageShell>
  );
}
