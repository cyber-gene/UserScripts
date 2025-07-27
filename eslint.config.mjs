import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import { defineConfig } from "eslint/config";
import userscripts from "eslint-plugin-userscripts";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    languageOptions: { globals: globals.browser },
    rules: {
      ...eslintConfigPrettier.rules,
      "prettier/prettier": "error",
      // Additional rules can be added here
    },
  },
  {
    files: ["*.user.js"],
    plugins: {
      userscripts: userscripts,
    },
    rules: {
      ...userscripts.configs.recommended.rules,
    },
  },
]);
