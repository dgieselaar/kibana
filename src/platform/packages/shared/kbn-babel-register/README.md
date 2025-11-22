# @kbn/babel-register

Babel register hooks for CommonJS and ESM modules.

## Usage

### CommonJS (require hook)

```js
require('@kbn/babel-register').install();
```

This installs a CommonJS require hook that will transform files using Babel on-the-fly.

### ESM (import hook)

```js
require('@kbn/babel-register').installEsm();
```

This registers an ESM loader using Node.js's `module.register()` API (requires Node.js 22+).

The ESM loader:
- Resolves imports by adding file extensions: `.ts`, `.tsx`, `.js`, `.jsx`
- Resolves directory imports to index files: `index.ts`, `index.tsx`, `index.js`, `index.jsx`
- Transforms files with Babel when they are loaded

## Features

Both hooks:
- Use efficient disk-based caching
- Support TypeScript (`.ts`, `.tsx`)
- Support special file types (`.text`, `.peggy`)
- Ignore `node_modules` (except `@kbn` packages)
- Ignore babel-related packages to avoid circular transformations

## Requirements

- Node.js 22+ for ESM support (`installEsm`)
- Node.js 16+ for CommonJS support (`install`)
