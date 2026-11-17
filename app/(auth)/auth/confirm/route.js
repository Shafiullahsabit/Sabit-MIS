import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const validOtpTypes = new Set([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export async function GET(request) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.redirect(
      new URL("/sign-in?status=configuration", request.url),
    );
  }

  const url = new URL(request.url);
  const nextPath =
    url.searchParams.get("next") === "/auth/accept-invite"
      ? "/auth/accept-invite"
      : "/";
  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let authError;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    authError = result.error;
  } else if (tokenHash && type && validOtpTypes.has(type)) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    authError = result.error;
  } else {
    return NextResponse.redirect(
      new URL("/sign-in?status=invalidInvite", request.url),
    );
  }

  if (authError) {
    return NextResponse.redirect(
      new URL("/sign-in?status=invalidInvite", request.url),
    );
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
