import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { InviteAcceptanceForm } from "@/components/auth/invite-acceptance-form";
import { InvitePendingMessage } from "@/components/auth/invite-pending-message";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage() {
  if (!hasSupabasePublicConfig()) {
    redirect("/sign-in?status=configuration");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    throw userError;
  }

  if (!user) {
    redirect("/sign-in?status=invalidInvite");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    redirect("/sign-in?status=invalidInvite");
  }

  return (
    <AuthPageShell>
      {profile.is_active ? (
        <InviteAcceptanceForm />
      ) : (
        <InvitePendingMessage />
      )}
    </AuthPageShell>
  );
}
