import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import wails from "../../wails/v3/internal/runtime/desktop/@wailsio/runtime/src/plugins/vite.ts";
import { fileURLToPath, URL } from "node:url";

const wailsRuntime = fileURLToPath(
  new URL(
    process.env.VITEST
      ? "./src/test/wails-runtime.ts"
      : "../../wails/v3/internal/runtime/desktop/@wailsio/runtime/src/index.ts",
    import.meta.url,
  ),
);

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: parseInt(process.env.WAILS_VITE_PORT || "9245"),
    strictPort: true,
  },
  plugins: [
    tailwindcss(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["globalVariable", "baseLocale"],
      emitTsDeclarations: true,
    }),
    svelte({ preprocess: vitePreprocess() }),
    ...(process.env.VITEST ? [] : [wails("./bindings")]),
  ],
  resolve: {
    conditions: process.env.VITEST ? ["browser"] : undefined,
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@wailsio/runtime": wailsRuntime,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
