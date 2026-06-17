import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      // Stub out `server-only` so server modules can be unit-tested.
      {
        find: "server-only",
        replacement: resolve(__dirname, "test/server-only.stub.ts"),
      },
      { find: "@", replacement: resolve(__dirname, "src") },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
  },
});
