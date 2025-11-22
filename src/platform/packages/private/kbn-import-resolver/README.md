# @kbn/import-resolver

Import resolver for Kibana packages and dependencies.

## Features

- Resolves imports from Kibana packages (`@kbn/*`)
- Resolves imports from node_modules
- Supports package.json `exports` field
  - Sub-path exports (e.g., `pkg/submodule`)
  - Default exports with `{ ".": { "default": "./dist/index.js" } }` pattern
- Resolves relative and absolute paths
- Provides package metadata for resolved imports

## Usage

```typescript
import { ImportResolver } from '@kbn/import-resolver';

const resolver = ImportResolver.create(repoRoot);
const result = resolver.resolve('@kbn/utils', dirname);
```
