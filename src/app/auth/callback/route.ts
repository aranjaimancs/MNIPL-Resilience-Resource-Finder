import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only allow same-origin relative paths (e.g. "/admin"). Rejects anything
// starting with "//" (protocol-relative) or containing a scheme ("https://").
function safeRedirectPath(raw: string | null): string {
  if (raw && /^\/(?!\/)/.test(raw)) return raw;
  return "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
