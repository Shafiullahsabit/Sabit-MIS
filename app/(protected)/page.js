import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const dashboardData = await getDashboardData(supabase);

  return <Dashboard {...dashboardData} />;
}
