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
    globalSetup: path.resolve(__dirname, "tests/setup/globalEnvSetup.ts"),

    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./tests/coverage",
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
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
