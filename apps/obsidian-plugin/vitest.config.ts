import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    alias: {
      // Mock obsidian module - it's only available as types in the plugin context
      obsidian: new URL("./__mocks__/obsidian.ts", import.meta.url).pathname,
    },
  },
});
