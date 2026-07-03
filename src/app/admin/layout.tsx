import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Only hub_admin and mnipl_admin may access the admin area.
  // Residents who sign up get the default 'resident' role and are turned away here.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "hub_admin" && profile?.role !== "mnipl_admin") {
    redirect("/?unauthorized=1");
  }

  return <>{children}</>;
}
