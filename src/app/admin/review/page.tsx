import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Hub, ManagedUser } from "@/lib/types";
import { ReviewClient } from "@/components/ReviewClient";

export default async function ReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin/review");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "mnipl_admin") redirect("/admin");

  // Fetch pending hubs, all verified hubs, and users in parallel
  const [{ data: pendingHubs }, { data: allHubs }, { data: users }] = await Promise.all([
    supabase.from("hubs").select("*").eq("verified", false).order("created_at"),
    supabase.from("hubs").select("*").eq("verified", true).order("name"),
    supabase.rpc("admin_list_users"),
  ]);

  return (
    <ReviewClient
      hubs={(pendingHubs as Hub[]) ?? []}
      allHubs={(allHubs as Hub[]) ?? []}
      users={(users as ManagedUser[]) ?? []}
      currentUserId={user.id}
    />
  );
}
