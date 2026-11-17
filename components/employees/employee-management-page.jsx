import { notFound } from "next/navigation";
import { EmployeeManagementPanel } from "@/components/employees/employee-management-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function EmployeeManagementPage() {
  const supabase = await createSupabaseServerClient();
  const { data: canManageEmployees, error: permissionError } =
    await supabase.rpc("current_user_has_permission", {
      p_permission_code: "employees.manage",
    });

  if (permissionError) {
    throw permissionError;
  }

  if (!canManageEmployees) {
    notFound();
  }

  const [
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, employee_code, phone, preferred_language, is_active, role_id, created_at",
      )
      .order("display_name"),
    supabase.from("roles").select("id, code, name").order("name"),
  ]);

  if (profilesError) {
    throw profilesError;
  }

  if (rolesError) {
    throw rolesError;
  }

  const roleNames = new Map(roles.map((role) => [role.id, role.name]));
  const roleCodes = new Map(roles.map((role) => [role.id, role.code]));

  return (
    <EmployeeManagementPanel
      employees={profiles.map((profile) => ({
        ...profile,
        roleCode: roleCodes.get(profile.role_id),
        roleName: roleNames.get(profile.role_id),
      }))}
    />
  );
}
