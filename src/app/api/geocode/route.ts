import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";

// In-memory rate limiter: max 10 geocode requests per user per minute.
// Resets automatically; stale entries are pruned on each request.
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const WINDOW = 60_000;
  const LIMIT = 10;

  // Prune expired entries to prevent unbounded memory growth
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }

  const entry = rateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + WINDOW });
    return false; // not limited
  }
  if (entry.count >= LIMIT) return true; // limited
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  // Reject oversized bodies before parsing (addresses are never > 8 KB)
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > 8192) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  // Auth check — only logged-in users can geocode
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per minute per user
  if (checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.trim() : "";

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (address.length > 500) {
    return NextResponse.json({ error: "address is too long" }, { status: 400 });
  }

  const result = await geocodeAddress(address);

  if (!result) {
    return NextResponse.json(
      { error: "Address not found. Try adding the city and state." },
      { status: 422 }
    );
  }

  return NextResponse.json({ lat: result.lat, lng: result.lng });
}
