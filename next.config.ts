import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['recharts'],
    },
};

export default nextConfig;
