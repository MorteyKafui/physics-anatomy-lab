/** `import text from "./file.md?raw"`: the file's text, bundled at build time (next.config.ts). */
declare module "*?raw" {
  const text: string;
  export default text;
}
