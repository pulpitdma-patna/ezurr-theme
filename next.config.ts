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

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

/**
 * Refuse to produce a production build that cannot reach the API.
 *
 * Sign-in used to fall back to a local branch that accepted any six digits and
 * derived the admin role from the phone number, so one forgotten env var
 * silently shipped an open admin. The fallback is gone and sign-in now fails
 * closed, but a build with no API is still a store that cannot authenticate
 * anyone — better to fail here, in the deploy log, than at the first customer.
 *
 * This check lives in next.config rather than in lib/auth.ts because config is
 * guaranteed to execute on every build; a module-level throw in application
 * code does not run at build time for dynamically rendered routes.
 */
if (process.env.NODE_ENV === "production" && !apiUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Ezurr cannot authenticate anyone without the " +
      "API and will not fall back to a local session. Set it and rebuild.",
  );
}

// Allow product images served from the Laravel API's public storage.
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
