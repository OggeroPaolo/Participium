import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: [path.resolve(__dirname, 'tests/setup/globalEnvSetup.ts')],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',

      // ✅ Only include these files/folders in coverage
      include: [
        'src/routes/**/*.ts',
        'src/dao/**',
      ],

      // 🚫 Ignore everything else
      exclude: [
        'tests/**',
        'src/config/**',
        'src/db/**',
        'src/middlewares/**',
        '**/*.d.ts',
      ],
    },
  },
});

