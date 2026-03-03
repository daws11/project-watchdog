import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 60000, // 60 seconds for LLM calls
    hookTimeout: 30000,
    teardownTimeout: 30000,
    maxConcurrency: 1, // Run tests sequentially to avoid DB conflicts
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "node_modules",
        "dist",
        "src/test/**",
        "src/scripts/**",
        "**/*.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
