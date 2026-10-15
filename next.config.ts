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
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      // Pages are never stored by the browser or proxies; only hashed build assets
      // (/_next/static) and the public OCR engine files are cacheable.
      {
        source: "/((?!_next/static|_next/image|ocr/).*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
