/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  // Fix Google Sign-in popup blocked by COOP policy
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle undici compatibility issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Exclude undici from webpack processing
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        undici: "undici",
      });
    }

    return config;
  },
  experimental: {
    esmExternals: "loose",
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: true,
  disable:
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview",
  workboxOptions: {
    disableDevLogs: true,
    ignoreURLParametersMatching: [/^__vercel_toolbar_code$/],
  },
});

module.exports = withPWA(nextConfig);
