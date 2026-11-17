import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import BalancedSequencer from "./test/balanced-sequencer";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Leave CPU headroom for jsdom commits and animation frames in CI.
    maxWorkers: process.env.CI ? 2 : undefined,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    sequence: { sequencer: BalancedSequencer },
  },
});
