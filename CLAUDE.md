# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
yarn install

# Lint all scripts (zero warnings allowed)
yarn eslint . --max-warnings 0

# Lint a specific file
yarn eslint YouTube/yt-toggle-autoplay-on-idle.user.js
```

The CI pipeline (`eslint.yml`) runs `yarn eslint . --max-warnings 0` on every PR targeting `main`.

## Architecture

This is a collection of Tampermonkey/userscript-manager scripts, organized by platform/category (e.g., `YouTube/`). Each script is a standalone IIFE in a single `.user.js` file — there is no build step and no module bundler.

### Script structure

Each `.user.js` file follows the Tampermonkey metadata block convention at the top (`// ==UserScript==` ... `// ==/UserScript==`), followed by a self-executing IIFE:

```js
(function () {
  "use strict";
  // script logic
})();
```

Scripts use `@updateURL` and `@downloadURL` pointing to the raw GitHub URL for auto-updates via userscript managers.

### Linting

ESLint is configured with:
- `eslint-plugin-userscripts` — validates userscript metadata blocks in `*.user.js` files
- `eslint-plugin-prettier` / `eslint-config-prettier` — enforces Prettier formatting as ESLint errors
- `globals.browser` — browser globals are assumed available (no `@grant` injection needed)

Prettier formatting is enforced as an ESLint error, so formatting violations fail the lint step.

### Adding new scripts

Place new scripts in a subdirectory named after the target platform (e.g., `YouTube/`, `Twitter/`). The file must be named `*.user.js` so the userscripts ESLint rules apply.