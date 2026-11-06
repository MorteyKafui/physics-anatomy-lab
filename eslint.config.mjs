// Shared lint rules for the TypeScript packages. Apps extend this with eslint-config-next.
export default [
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/.open-next/**", "**/dist/**", "research/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },
];
