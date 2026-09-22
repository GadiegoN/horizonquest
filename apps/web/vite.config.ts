import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The backend consumes CommonJS; the browser uses the shared TypeScript source.
    alias: { "@horizon/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)) },
  },
});
