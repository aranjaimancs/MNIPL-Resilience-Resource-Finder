import { createClient } from "@/lib/supabase/server";
import type { Hub, ProfileQuestion } from "@/lib/types";
import { DEFAULT_PROFILE_QUESTIONS } from "@/lib/profileQuestions";
import { ResidentView } from "@/components/ResidentView";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ hub?: string }>;
}) {
  const { hub: hubId } = await searchParams;
  const supabase = await createClient();

  // Fetch hubs, profile questions, and the current user's role in parallel
  const [{ data: hubs }, { data: questions }, { data: { user } }] = await Promise.all([
    supabase.from("hubs").select("*").eq("verified", true).order("name"),
    supabase.from("profile_questions").select("*").order("display_order"),
    supabase.auth.getUser(),
  ]);

  let isMniplAdmin = false;
  let isHubAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isMniplAdmin = profile?.role === "mnipl_admin";
    isHubAdmin = profile?.role === "hub_admin" || isMniplAdmin;
  }

  const allHubs = (hubs as Hub[]) ?? [];
  const initialHub = hubId ? (allHubs.find((h) => h.id === hubId) ?? null) : null;
  const profileQuestions = (questions as ProfileQuestion[]) ?? DEFAULT_PROFILE_QUESTIONS;

  return (
    <ResidentView
      hubs={allHubs}
      initialHub={initialHub}
      isMniplAdmin={isMniplAdmin}
      isHubAdmin={isHubAdmin}
      profileQuestions={profileQuestions}
    />
  );
}
