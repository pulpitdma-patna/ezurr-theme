import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "ezurr.com",
    pathname: "/cdn/shop/files/**",
  },
  {
    // Shopify CDN — product/collection images imported by the Shopify sync module.
    protocol: "https",
    hostname: "cdn.shopify.com",
    pathname: "/s/files/**",
  },
];

// Allow product images served from the Laravel API's public storage.
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
if (apiUrl) {
  try {
    const u = new URL(apiUrl);
    remotePatterns.push({
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      port: u.port || undefined,
      pathname: "/storage/**",
    });
  } catch {
    // ignore malformed NEXT_PUBLIC_API_URL
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  // Legacy query-string → path redirects are handled in middleware.ts so the
  // stale query string is stripped (next.config redirects forward it, which
  // both dirties the canonical URL and loops /checkout?cart=1 onto itself).
};

export default nextConfig;
