import { getHourlyRevenueForDate } from "@/lib/dashboard-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request) {
  const requestedDate = new URL(request.url).searchParams.get("date");

  if (!requestedDate) {
    return Response.json({ error: "invalid_date" }, { status: 400 });
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
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const points = await getHourlyRevenueForDate(supabase, requestedDate);

  if (!points) {
    return Response.json({ error: "invalid_date" }, { status: 400 });
  }

  return Response.json(
    { points },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
