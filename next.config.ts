import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Leaflet is incompatible with React Strict Mode's double-effect invocation
  reactStrictMode: false,
  // Leaflet uses window — never bundle it on the server
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default withPWA({
  dest: "public",
  // Disable in dev — service workers break hot reload
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  // Show /offline page for uncached URLs instead of browser error
  fallbacks: { document: "/offline" },
  workboxOptions: {
    runtimeCaching: [
      // Auth and API routes must NEVER be served from cache or the offline fallback.
      // The service worker passes them straight to the network so the server can
      // handle the auth code exchange, session cookies, and redirects correctly.
      {
        urlPattern: /^https?:\/\/[^/]+\/(auth|api)(\/|$)/,
        handler: "NetworkOnly",
      },
      // Same for login and admin — always fetch fresh so session state is correct.
      {
        urlPattern: /^https?:\/\/[^/]+\/(login|admin)(\/|$)/,
        handler: "NetworkOnly",
      },
      // Main page — NetworkFirst so online users get fresh hub statuses,
      // offline users get the cached page (which contains hub list in RSC payload)
      {
        urlPattern: /^https?:\/\/[^/]+\/$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "page-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          cacheableResponse: { statuses: [200] },
        },
      },
      // Next.js static chunks — content-hashed filenames, safe to cache forever
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [200] },
        },
      },
      // OpenStreetMap tiles — runtime cache as user browses (~10MB cap)
      // Tiles rarely change; 30-day TTL is safe
      {
        urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "osm-tiles",
          expiration: {
            maxEntries: 1000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
})(nextConfig);
