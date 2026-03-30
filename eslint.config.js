import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Disallow the `any` type without an explicit cast — keeps the public API fully typed
      "@typescript-eslint/no-explicit-any": "error",

      // Unused variables are always bugs in a library — prefix with _ to opt out
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
