import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

const statusMessages = {
  configuration: "auth.configurationMissing",
  inactive: "auth.inactiveAccount",
  invalidInvite: "auth.invalidInvite",
  invitePending: "auth.invitePending",
};

export default async function SignInPage({ searchParams }) {
  const { status } = await searchParams;

  return (
    <AuthPageShell>
      <SignInForm
        configured={hasSupabasePublicConfig()}
        key={status}
        status={statusMessages[status]}
      />
    </AuthPageShell>
  );
}
