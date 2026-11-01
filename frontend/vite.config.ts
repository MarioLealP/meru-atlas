import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  build: { outDir: "dist", sourcemap: false, assetsInlineLimit: 0 }, // no data: URLs (CSP img/font 'self')
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
