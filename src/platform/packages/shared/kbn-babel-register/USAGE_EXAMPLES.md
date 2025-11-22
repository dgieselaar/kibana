# Usage Examples

## ESM Module Support

### Basic Usage

Register the ESM loader to enable TypeScript imports:

```js
// entry.js
require('@kbn/babel-register').installEsm();
```

Now you can import TypeScript files directly:

```js
// main.mjs
import { myFunction } from './utils.ts';
import { MyComponent } from './components/index.tsx';

myFunction();
```

### Combined CommonJS and ESM

You can use both hooks together if your project uses both module systems:

```js
// entry.js
const register = require('@kbn/babel-register');

// Enable CommonJS require hook
register.install();

// Enable ESM import hook
register.installEsm();

// Now both require() and import work with TypeScript
require('./cjs-module.ts');
import('./esm-module.ts');
```

## How the ESM Loader Works

### Import Resolution

The loader resolves imports by trying multiple extensions:

```js
// import './module' resolves to:
// 1. ./module.ts
// 2. ./module.tsx
// 3. ./module.js
// 4. ./module.jsx

// import './components' resolves to:
// 1. ./components/index.ts
// 2. ./components/index.tsx
// 3. ./components/index.js
// 4. ./components/index.jsx
```

### File Transformation

When a file is loaded, it's transformed with Babel if it matches these patterns:

- `.ts`, `.tsx` - TypeScript files
- `.js`, `.jsx` - JavaScript files
- `.text` - Text template files
- `.peggy` - PEG.js grammar files

### Ignored Patterns

The loader skips transformation for:

- `node_modules` (except `@kbn/*` packages)
- Packages with "babel" in their name
- Canvas plugin files (`/canvas/canvas_plugin/`)

## Example Project Structure

```
my-project/
├── package.json
├── entry.js          # Registers the ESM loader
├── src/
│   ├── index.ts      # Main entry point
│   ├── utils.ts      # Utility functions
│   └── components/
│       └── index.tsx # React components
```

**entry.js:**
```js
require('@kbn/babel-register').installEsm();
import('./src/index.ts').then((module) => {
  module.main();
});
```

**src/index.ts:**
```ts
import { helper } from './utils';
import { MyComponent } from './components';

export function main() {
  console.log('App started');
  helper();
}
```

## Node.js Requirements

The ESM loader requires Node.js 22+ because it uses the `module.register()` API introduced in Node.js 20.6.0 and stabilized in Node.js 22.

If you try to use `installEsm()` on an older Node version, you'll get:

```
Error: @kbn/babel-register: installEsm() requires Node.js 22+ with module.register() support
```
