import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["node_modules", "dist", "coverage"],
    globalSetup: [path.resolve(__dirname, "tests/setup/globalEnvSetup.ts")],
    

    // ✅ Coverage configuration
    coverage: {
      provider: "v8", // "v8" is fastest; you can also use "istanbul"
      reporter: ["text", "lcov", "html"], // Add LCOV for CI tools
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "coverage/",
        "**/config/**",
        "**/db/**",
        "vitest.config.ts",
      ],

      // ✅ Optional but highly recommended:
      all: true, // include all files, not just those touched by tests
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
