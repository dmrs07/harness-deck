import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.dmrs07.harness-deck.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true
  },
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    typescript({ tsconfig: "./tsconfig.json" })
  ]
};
