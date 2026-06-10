import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://vercel.live https://*.vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://vercel.live https://*.vercel.live; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:8080 https://*.onrender.com https://accounts.google.com https://vercel.live https://*.vercel.live wss://*.pusher.com; img-src 'self' data: blob: https://lh3.googleusercontent.com https://vercel.live https://*.vercel.live https://*.vercel.com; frame-src 'self' https://accounts.google.com https://vercel.live https://*.vercel.live;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
