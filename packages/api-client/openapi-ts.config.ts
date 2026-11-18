// Generates src/generated from openapi.json, which apps/api writes (see the README).
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: { path: "./src/generated" },
  plugins: ["@hey-api/typescript"],
});
