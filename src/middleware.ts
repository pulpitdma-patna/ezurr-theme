import { NextRequest, NextResponse } from "next/server";

function toOrigin(raw?: string): string {
  const v = raw?.trim();
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return "";
  }
}

/** Origin of the Laravel API, so fetch()/XHR to it survives connect-src. */
function apiOrigin(): string {
  return toOrigin(process.env.NEXT_PUBLIC_API_URL);
}

/** Origin that serves CMS custom-code sandbox iframes (defaults to the API). */
function sandboxOrigin(): string {
  return toOrigin(process.env.NEXT_PUBLIC_CMS_SANDBOX_URL) || apiOrigin();
}

/**
 * 308-redirect legacy query-string URLs to their SEO-friendly path form, with
 * the stale query string stripped. Returns a response to short-circuit, or null
 * to continue to normal (CSP) handling.
 */
function legacyUrlRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/product") {
    const key = searchParams.get("key")?.trim();
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = key ? `/products/${encodeURIComponent(key)}` : "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/checkout") {
    const key = searchParams.get("key")?.trim();
    if (key) {
      const url = request.nextUrl.clone();
      url.search = "";
      url.pathname = `/checkout/${encodeURIComponent(key)}`;
      return NextResponse.redirect(url, 308);
    }
    if (searchParams.has("cart")) {
      // Cart mode is now bare /checkout — strip the param (avoids a self-loop).
      const url = request.nextUrl.clone();
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
  }

  // CMS pages moved from /pages/<slug> to /<slug>. Those URLs are indexed and
  // forwarded around, so they redirect rather than 404 — and the seeded policy
  // pages cross-link each other, so a migration rewrote those hrefs too instead of
  // relying on this for every internal click.
  const legacyCmsPage = /^\/pages\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (legacyCmsPage) {
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = `/${legacyCmsPage[1]}`;
    return NextResponse.redirect(url, 308);
  }

  // The five pre-CMS category paths keep their URLs, so /categories/games must
  // never serve 200 as well — a second live URL for the same products is
  // duplicate content, and /games is the one that is already indexed.
  const legacyCategory = /^\/categories\/(games|consoles|accessories|game-cards|preorders)\/?$/.exec(
    pathname,
  );
  if (legacyCategory) {
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = `/${legacyCategory[1]}`;
    return NextResponse.redirect(url, 308);
  }

  return null;
}

export function middleware(request: NextRequest) {
  const legacy = legacyUrlRedirect(request);
  if (legacy) return legacy;

  const isDev = process.env.NODE_ENV !== "production";
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const api = apiOrigin();

  // Razorpay Checkout: the sheet is an iframe (frame-src) that loads
  // checkout.razorpay.com (script-src fallback for non-strict-dynamic browsers)
  // and calls api/lumberjack (connect-src). Harmless when payments are unused.
  const rzpScript = "https://checkout.razorpay.com";
  const rzpConnect = "https://api.razorpay.com https://lumberjack.razorpay.com";
  // Checkout location helpers: India Post pincode→city lookup + GPS reverse-geocode.
  const geoConnect = "https://api.postalpincode.in https://api.bigdatacloud.net";
  // Analytics beacons (GA4 /g/collect + Meta Pixel /tr). Scripts load via
  // strict-dynamic from the nonce'd loader; only the beacon hosts need listing.
  const analyticsConnect =
    "https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://www.facebook.com https://connect.facebook.net";
  const rzpFrame = "https://api.razorpay.com https://checkout.razorpay.com";
  // CMS custom code runs only inside a cross-origin, opaque-origin sandbox frame
  // served from this origin (its own tight CSP). Parent CSP only needs frame-src.
  const sandbox = sandboxOrigin();

  // Dev (Turbopack HMR) needs inline+eval; production locks scripts to a
  // per-request nonce + strict-dynamic so injected inline scripts can't run.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}' 'strict-dynamic' ${rzpScript}`;

  // When the browser uses the same-origin API proxy, API calls need only
  // 'self'. Keep the absolute API origin too so direct mode and image/beacon
  // hosts that still point at Laravel stay allowed.
  const connectSrc = ["'self'", api, rzpConnect, geoConnect, analyticsConnect, isDev ? "ws: wss:" : ""]
    .filter(Boolean)
    .join(" ");

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${api}`.trim(),
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `frame-src 'self' ${rzpFrame} ${sandbox}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the CSP from the request to attach the nonce to its own scripts.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next's static assets and the favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
