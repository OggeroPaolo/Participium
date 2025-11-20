import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globals: true,
    environment: "node",

    // Include test files
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],

    // Exclude unwanted files/folders
    exclude: ["node_modules", "dist", "coverage"],

    // Optional: global setup file
    globalSetup: [path.resolve(__dirname, "tests/setup/globalEnvSetup.ts")],

    // Coverage configuration for SonarQube
    coverage: {
      provider: "v8", // Fast V8 coverage
      reporter: ["text", "lcov", "html"], // LCOV for SonarQube
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "coverage/",
        "**/config/**",
        "**/db/**",
        "src/app.ts",
        "src/server.ts",
        "vitest.config.ts",
      ],
      all: true, // Include all files, even if not tested
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
