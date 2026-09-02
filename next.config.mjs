/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "pdf-parse",
      "exceljs",
      "mammoth",
      "bcryptjs",
      "pg",
    ],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
