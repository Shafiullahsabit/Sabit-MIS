"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm({ configured, status }) {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(status ? t(status) : "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user) {
        setError(t("auth.signInFailed"));
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw signOutError;
        }
        setError(t("auth.profileCheckFailed"));
        return;
      }

      if (!profile || !profile.is_active) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw signOutError;
        }
        setError(t("auth.inactiveAccount"));
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
          {t("auth.signInTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("auth.signInDescription")}
        </p>
      </div>

      {!configured ? (
        <p
          aria-live="polite"
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-foreground"
          role="alert"
        >
          {t("auth.configurationMissing")}
        </p>
      ) : null}
      {error ? (
        <p
          aria-live="polite"
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-foreground"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5 text-xs font-medium">
          <span>{t("auth.email")}</span>
          <span className="relative block">
            <Mail
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3"
              size={16}
            />
            <input
              autoComplete="username"
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-accent rtl:pl-3 rtl:pr-10"
              disabled={!configured || pending}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </span>
        </label>
        <label className="block space-y-1.5 text-xs font-medium">
          <span>{t("auth.password")}</span>
          <span className="relative block">
            <LockKeyhole
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3"
              size={16}
            />
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-accent rtl:pl-3 rtl:pr-10"
              disabled={!configured || pending}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </span>
        </label>
        <Button
          className="w-full"
          disabled={!configured || pending}
          type="submit"
        >
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : null}
          {pending ? t("auth.signingIn") : t("auth.signIn")}
          {!pending ? <ArrowRight className="rtl:rotate-180" size={15} /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
        {t("auth.invitationOnly")}{" "}
        <Link
          className="font-semibold text-accent underline-offset-4 hover:underline"
          href="/sign-up"
        >
          {t("auth.learnAboutInvites")}
        </Link>
      </p>
    </>
  );
}
