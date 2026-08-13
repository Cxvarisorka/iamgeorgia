import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * All imagery is local and served from /public. The default breakpoint set
     * generates far more variants than this design needs — the widest element
     * is a 100vw hero, so anything above 1920 is wasted work. Trimming the list
     * cuts first-request optimisation time substantially.
     */
    deviceSizes: [640, 828, 1080, 1200, 1600, 1920],
    imageSizes: [128, 256, 384],
    /** WebP only: AVIF encoding costs far more CPU than it saves here. */
    formats: ["image/webp"],
  },
};

export default nextConfig;
