import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supportedLanguages = new Set(["en", "fa", "ps"]);
const supportedRoles = new Set(["admin", "cashier"]);

function jsonError(error, status) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  let requestOrigin;

  if (!hasSupabasePublicConfig()) {
    return jsonError("configuration", 503);
  }

  try {
    requestOrigin = origin ? new URL(origin).origin : null;
  } catch {
    return jsonError("forbidden", 403);
  }

  if (!requestOrigin || requestOrigin !== requestUrl.origin) {
    return jsonError("forbidden", 403);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError("invalid_request", 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return jsonError("invalid_request", 413);
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
    return jsonError("forbidden", 401);
  }

  const { data: canManageEmployees, error: permissionError } =
    await supabase.rpc("current_user_has_permission", {
      p_permission_code: "employees.manage",
    });

  if (permissionError) {
    throw permissionError;
  }

  if (!canManageEmployees) {
    return jsonError("forbidden", 403);
  }

  let body;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("invalid_request", 400);
    }

    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("invalid_request", 400);
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const employeeCode =
    typeof body.employeeCode === "string" ? body.employeeCode.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const roleCode = body.roleCode;
  const preferredLanguage = body.preferredLanguage;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    displayName.length < 1 ||
    displayName.length > 120 ||
    employeeCode.length > 40 ||
    phone.length > 40 ||
    !supportedRoles.has(roleCode) ||
    !supportedLanguages.has(preferredLanguage)
  ) {
    return jsonError("invalid_request", 400);
  }

  if (employeeCode) {
    const { data: existingProfile, error: employeeCodeError } = await supabase
      .from("profiles")
      .select("id")
      .eq("employee_code", employeeCode)
      .maybeSingle();

    if (employeeCodeError) {
      throw employeeCodeError;
    }

    if (existingProfile) {
      return jsonError("invalid_request", 409);
    }
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    return jsonError("configuration", 503);
  }

  const adminClient = createSupabaseAdminClient();
  const redirectTo = new URL(
    "/auth/confirm?next=%2Fauth%2Faccept-invite",
    requestUrl,
  ).toString();
  const { data: invitation, error: invitationError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName },
      redirectTo,
    });

  if (invitationError || !invitation.user) {
    return jsonError("email_invite_failed", 400);
  }

  const { error: profileError } = await supabase.rpc("admin_update_employee", {
    p_employee_id: invitation.user.id,
    p_role_code: roleCode,
    p_display_name: displayName,
    p_employee_code: employeeCode || null,
    p_phone: phone || null,
    p_preferred_language: preferredLanguage,
    p_is_active: true,
  });

  if (profileError) {
    console.error(
      "Invited employee profile assignment failed.",
      profileError.message,
    );
    return jsonError("profile_not_saved", 502);
  }

  return NextResponse.json(
    { employee: { id: invitation.user.id } },
    { status: 201 },
  );
}
