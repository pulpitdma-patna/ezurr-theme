import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ezurr.com",
        pathname: "/cdn/shop/files/**",
      },
    ],
  },
};

export default nextConfig;
