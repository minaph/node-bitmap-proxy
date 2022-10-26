import { defineConfig } from "vite"

const config = defineConfig({
  build: {
    target: "modules",
    outDir: "vite",
    // lib: {
    //   entry: "./src/testUserScript.ts",
    // }
    rollupOptions: {
      input: ["src/testUserScript.ts"],
    }
  }
})

export default config