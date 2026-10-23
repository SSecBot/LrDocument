import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. In production scripts, workers, fonts and network requests are limited
 * to this site; the only outside hosts are the public exchange-rate services. Even an injected
 * script could not send data elsewhere. ('unsafe-inline' is needed for Next.js' inline bootstrap
 * scripts; 'wasm-unsafe-eval' for the in-browser PDF / OCR engines.) Development keeps a loose
 * policy because hot reloading relies on eval.
 */
const csp = isProd
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' data: blob: https://open.er-api.com https://api.frankfurter.dev https://cdn.jsdelivr.net",
      "media-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ")
  : "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

const securityHeaders = [
  // Disallow embedding the app in frames (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Every API request passes the proxy (CSRF check), which buffers the body up to this size and
    // silently cuts what is beyond it. Room for the largest upload (PDF notes: 25 MB) and backups;
    // each route still enforces its own, smaller limit.
    proxyClientMaxBodySize: '60mb',
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      // Stored files (PDF notes): even opened directly they cannot run scripts in this origin.
      { source: "/api/files/:path*", headers: [{ key: "Content-Security-Policy", value: "sandbox; default-src 'none'; style-src 'unsafe-inline'" }] },
      // Service worker of the installable app: always revalidated, allowed to control the whole site.
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
      // Pages are never stored by the browser or proxies; only hashed build assets
      // (/_next/static), the public OCR engine files and the versioned (?v=) dictionaries are cacheable.
      {
        source: "/((?!_next/static|_next/image|ocr/|i18n/).*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      { source: "/i18n/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
