import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Remove the experimental section if it only contained appDir
  // If you have other experimental features, keep them and remove only appDir
}

export default nextConfig

