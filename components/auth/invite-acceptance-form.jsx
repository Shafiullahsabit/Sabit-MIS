"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function InviteAcceptanceForm() {
  const { t } = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 12) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(t("auth.passwordUpdateFailed"));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(t("auth.connectionFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          {t("auth.staffAccess")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          {t("auth.acceptInviteTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("auth.acceptInviteDescription")}
        </p>
      </div>

      {error ? (
        <p
          aria-live="polite"
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5 text-xs font-medium">
          <span>{t("auth.newPassword")}</span>
          <span className="relative block">
            <LockKeyhole
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3"
              size={16}
            />
            <input
              autoComplete="new-password"
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-accent rtl:pl-3 rtl:pr-10"
              disabled={pending}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </span>
        </label>
        <label className="block space-y-1.5 text-xs font-medium">
          <span>{t("auth.confirmPassword")}</span>
          <input
            autoComplete="new-password"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            disabled={pending}
            minLength={12}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : null}
          {pending ? t("auth.savingPassword") : t("auth.setPassword")}
        </Button>
      </form>
    </>
  );
}