import { defineConfig } from "vitest/config";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import wails from '@wailsio/runtime/plugins/vite'
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const testing = mode === "test";

  return {
    server: {
      host: "127.0.0.1"
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      alias: {
        "@wailsio/runtime": fileURLToPath(new URL("./src/test/wails-runtime.ts", import.meta.url)),
      },
    },
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        strategy: ["localStorage", "globalVariable", "baseLocale"],
        emitTsDeclarations: true,
      }),
      svelte({ preprocess: vitePreprocess() }),
      testing ? null : wails("./bindings"),
    ].filter(Boolean),
    resolve: {
      conditions: testing ? ["browser"] : undefined,
      alias: {
        "/src": fileURLToPath(new URL("./src", import.meta.url)),
        $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      },
    },
  };
});
