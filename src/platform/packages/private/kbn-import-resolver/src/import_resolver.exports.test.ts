/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';
import { Package } from '@kbn/repo-packages';
import { ImportResolver } from './import_resolver';

const FIXTURES_DIR = Path.resolve(__dirname, '__fixtures__');

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const resolver = ImportResolver.create(FIXTURES_DIR, [
  Package.fromManifest(FIXTURES_DIR, Path.resolve(FIXTURES_DIR, 'packages/box/kibana.jsonc')),
  Package.fromManifest(FIXTURES_DIR, Path.resolve(FIXTURES_DIR, 'src/bar/kibana.jsonc')),
]);

describe('ImportResolver - exports field support', () => {
  describe('default export in package.json', () => {
    it('should resolve package root with { default: string } export', () => {
      const result = resolver.resolve('default-exports-pkg', FIXTURES_DIR);
      
      expect(result).toMatchInlineSnapshot(`
        Object {
          "absolute": <absolute path>/src/platform/packages/private/kbn-import-resolver/src/__fixtures__/node_modules/default-exports-pkg/dist/index.js,
          "nodeModule": "default-exports-pkg",
          "type": "file",
        }
      `);
    });

    it('should handle the "." entry in exports', () => {
      // This test verifies that when subPathParts is empty (no sub-path),
      // the entry becomes "." instead of early exiting
      const result = resolver.resolve('default-exports-pkg', FIXTURES_DIR);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('file');
      expect(result?.absolute).toContain('default-exports-pkg/dist/index.js');
    });
  });

  describe('existing exports functionality', () => {
    it('should still resolve sub-path exports (exact match)', () => {
      expect(resolver.resolve('exports-pkg/my_module', FIXTURES_DIR)).toMatchInlineSnapshot(`
        Object {
          "absolute": <absolute path>/src/platform/packages/private/kbn-import-resolver/src/__fixtures__/node_modules/exports-pkg/dist/my_module.js,
          "nodeModule": "exports-pkg",
          "type": "file",
        }
      `);
    });

    it('should still resolve sub-path exports (wildcard match)', () => {
      expect(resolver.resolve('exports-pkg/sub/my_other_module', FIXTURES_DIR))
        .toMatchInlineSnapshot(`
        Object {
          "absolute": <absolute path>/src/platform/packages/private/kbn-import-resolver/src/__fixtures__/node_modules/exports-pkg/dist/sub/my_other_module.js,
          "nodeModule": "exports-pkg",
          "type": "file",
        }
      `);
    });
  });
});
