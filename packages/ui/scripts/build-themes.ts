import { writeFileSync } from "node:fs";
import { roleVariable, THEMES, themes, type Theme } from "../src/themes";

const decls = (name: Theme) =>
  Object.entries(roleVariable)
    .map(([role, v]) => `  ${v}: ${themes[name][role as keyof typeof roleVariable]};`)
    .join("\n");

const scheme = (name: Theme) => (name === "lab" ? "dark" : "light");

const out = `/*
 * Theme roles, generated from themes.ts (bun run themes). Do not edit by hand:
 * change themes.ts, run the script, and the tests check contrast and that the two match.
 *
 * Set a theme with data-theme on any element; the lab theme is the default.
 */
:root {
${decls("lab")}
  color-scheme: dark;
}
${THEMES.map(
  (name) => `
[data-theme="${name}"] {
${decls(name)}
  color-scheme: ${scheme(name)};
}`,
).join("\n")}
`;
writeFileSync(new URL("../src/themes.css", import.meta.url), out);
console.warn("wrote src/themes.css");
