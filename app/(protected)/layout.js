import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }) {
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
    redirect("/sign-in");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile || !profile.is_active) {
    redirect("/sign-in?status=inactive");
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("code, name")
    .eq("id", profile.role_id)
    .maybeSingle();

  if (roleError) {
    throw roleError;
  }

  if (!role) {
    throw new Error("The signed-in employee has no assigned role.");
  }

  const { data: canManageEmployees, error: permissionError } =
    await supabase.rpc("current_user_has_permission", {
      p_permission_code: "employees.manage",
    });

  if (permissionError) {
    throw permissionError;
  }

  return (
    <AppShell
      canManageEmployees={canManageEmployees}
      profile={{
        displayName: profile.display_name,
        roleCode: role.code,
        roleName: role.name,
      }}
    >
      {children}
    </AppShell>
  );
}
