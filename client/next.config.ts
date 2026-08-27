import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Catalogue imagery comes from the media bucket the API serializes URLs
     * for; editorial imagery is still local under /public. A host that is not
     * listed here is refused by the optimiser and the image renders as
     * nothing, so this has to track MEDIA_PUBLIC_BASE_URL on the server.
     */
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      // The local media driver, which a fresh checkout runs on.
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/media/**" },
    ],
    /**
     * The default breakpoint set generates far more variants than this design
     * needs — the widest element is a 100vw hero, so anything above 1920 is
     * wasted work. Trimming the list cuts first-request optimisation time
     * substantially.
     */
    deviceSizes: [640, 828, 1080, 1200, 1600, 1920],
    imageSizes: [128, 256, 384],
    /** WebP only: AVIF encoding costs far more CPU than it saves here. */
    formats: ["image/webp"],
  },
};

export default nextConfig;
