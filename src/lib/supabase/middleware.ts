import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CSP = [
  "default-src 'self'",
  // Next.js injects inline scripts for hydration; unsafe-inline is required
  "script-src 'self' 'unsafe-inline'",
  // Leaflet injects inline styles at runtime; unsafe-inline is required
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Hub photos (Supabase storage), OSM tiles, blob: for image previews, data: for Leaflet markers
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.supabase.co",
  // API calls: Supabase (https + wss for realtime), Nominatim geocoding
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org",
  // Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // No plugins, no iframes, no external form targets
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking — page cannot be embedded in an iframe
  "X-Frame-Options": "DENY",
  // Prevent MIME-type sniffing
  "X-Content-Type-Options": "nosniff",
  // Legacy XSS filter (IE/older Chrome)
  "X-XSS-Protection": "1; mode=block",
  // Only send origin on same-origin requests; strip referrer for cross-origin
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Disable browser features the app doesn't need
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=()",
  // Force HTTPS for 2 years, including subdomains
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Content Security Policy
  "Content-Security-Policy": CSP,
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin routes
  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(url);
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) =>
      redirectResponse.headers.set(k, v)
    );
    return redirectResponse;
  }

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) =>
    supabaseResponse.headers.set(k, v)
  );

  return supabaseResponse;
}
