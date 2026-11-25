import type { NextConfig } from "next";

// المنظومة كلها خلف تسجيل الدخول، فكل الصفحات ديناميكية تقرأ الجلسة.
// لذلك لا نفعّل cacheComponents في هذه المرحلة.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
