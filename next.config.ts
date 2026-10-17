import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly lock the Turbopack workspace root to this project directory
  // to avoid scanning outer directories if lockfiles exist in parent folders
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Dispose of compiled pages in development to prevent unbounded memory growth
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Prevent heavy client-side/export packages from inflating server memory
  serverExternalPackages: ['jspdf', 'jspdf-autotable'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
