import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      prettier: eslintPluginPrettier
    },
    languageOptions: { globals: globals.browser },
    rules: {
      ...eslintConfigPrettier.rules,
      "prettier/prettier": "error",
      // 追加のルールはここに記述
    }
  },
]);