import type { NextConfig } from "next";
const config1: NextConfig = { experimental: { turbo: { root: __dirname } } };
const config2: NextConfig = { turbopack: { root: __dirname } };
