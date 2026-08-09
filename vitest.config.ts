import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    // Integration tests share one Postgres database; running files in
    // parallel causes cross-test races on shared tables (e.g. the
    // AvailabilityRule unique constraint), so force sequential execution.
    fileParallelism: false,
  },
});
