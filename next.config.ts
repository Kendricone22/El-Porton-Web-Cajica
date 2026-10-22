import type { NextConfig } from "next";
import { CABECERAS_SEGURIDAD } from "./src/lib/cabeceras";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [...CABECERAS_SEGURIDAD] }];
  },
};

export default nextConfig;
