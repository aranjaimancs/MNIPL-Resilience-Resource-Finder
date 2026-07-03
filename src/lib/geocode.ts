export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim.
 * Server-side only — never call from client code.
 * Swappable: replace this implementation with Mapbox, Google, etc.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    format: "json",
    q: address,
    limit: "1",
    countrycodes: "us",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "MNIPL-ResilienceHubFinder/1.0 (info@mnipl.org)",
        Accept: "application/json",
      },
      // Nominatim rate limit: 1 req/sec
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  const first = data[0];
  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    display_name: first.display_name,
  };
}
