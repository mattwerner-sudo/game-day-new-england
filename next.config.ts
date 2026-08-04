import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads a WASM binary via native module resolution at runtime; it must not
  // be bundled by Turbopack/webpack or its asset paths break (ERR_INVALID_ARG_TYPE).
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
