import type { NextConfig } from "next";
const nextConfig: NextConfig = { headers: async () => [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'" }] }] };
export default nextConfig;
