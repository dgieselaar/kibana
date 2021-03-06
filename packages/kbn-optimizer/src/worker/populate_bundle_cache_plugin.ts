/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { inspect } from 'util';

import webpack from 'webpack';

import { Bundle, WorkerConfig, ascending, parseFilePath } from '../common';
import { BundleRefModule } from './bundle_ref_module';
import {
  isExternalModule,
  isNormalModule,
  isIgnoredModule,
  isConcatenatedModule,
  getModulePath,
} from './webpack_helpers';

function tryToResolveRewrittenPath(from: string, toResolve: string) {
  try {
    return require.resolve(toResolve);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `attempted to rewrite bazel-out path [${from}] to [${toResolve}] but couldn't find the rewrite target`
      );
    }

    throw error;
  }
}

/**
 * sass-loader creates about a 40% overhead on the overall optimizer runtime, and
 * so this constant is used to indicate to assignBundlesToWorkers() that there is
 * extra work done in a bundle that has a lot of scss imports. The value is
 * arbitrary and just intended to weigh the bundles so that they are distributed
 * across mulitple workers on machines with lots of cores.
 */
const EXTRA_SCSS_WORK_UNITS = 100;

export class PopulateBundleCachePlugin {
  constructor(private readonly workerConfig: WorkerConfig, private readonly bundle: Bundle) {}

  public apply(compiler: webpack.Compiler) {
    const { bundle, workerConfig } = this;

    compiler.hooks.emit.tap(
      {
        name: 'PopulateBundleCachePlugin',
        before: ['BundleMetricsPlugin'],
      },
      (compilation) => {
        const bundleRefExportIds: string[] = [];
        const referencedFiles = new Set<string>();
        let moduleCount = 0;
        let workUnits = compilation.fileDependencies.size;

        if (bundle.manifestPath) {
          referencedFiles.add(bundle.manifestPath);
        }

        for (const module of compilation.modules) {
          if (isNormalModule(module)) {
            moduleCount += 1;
            let path = getModulePath(module);
            let parsedPath = parseFilePath(path);

            const bazelOut = parsedPath.matchDirs(
              'bazel-out',
              /-fastbuild$/,
              'bin',
              'packages',
              /.*/,
              'target'
            );

            // if the module is referenced from one of our packages and resolved to the `bazel-out` dir
            // we should rewrite our reference to point to the source file so that we can track the
            // modified time of that file rather than the built output which is rebuilt all the time
            // without actually changing
            if (bazelOut) {
              const packageDir = parsedPath.dirs[bazelOut.endIndex - 1];
              const subDirs = parsedPath.dirs.slice(bazelOut.endIndex + 1);
              path = tryToResolveRewrittenPath(
                path,
                Path.join(
                  workerConfig.repoRoot,
                  'packages',
                  packageDir,
                  'src',
                  ...subDirs,
                  parsedPath.filename
                    ? Path.basename(parsedPath.filename, Path.extname(parsedPath.filename))
                    : ''
                )
              );
              parsedPath = parseFilePath(path);
            }

            if (parsedPath.matchDirs('bazel-out')) {
              throw new Error(
                `a bazel-out dir is being referenced by module [${path}] and not getting rewritten to its source location`
              );
            }

            if (!parsedPath.dirs.includes('node_modules')) {
              referencedFiles.add(path);

              if (path.endsWith('.scss')) {
                workUnits += EXTRA_SCSS_WORK_UNITS;

                for (const depPath of module.buildInfo.fileDependencies) {
                  referencedFiles.add(depPath);
                }
              }

              continue;
            }

            const nmIndex = parsedPath.dirs.lastIndexOf('node_modules');
            const isScoped = parsedPath.dirs[nmIndex + 1].startsWith('@');
            referencedFiles.add(
              Path.join(
                parsedPath.root,
                ...parsedPath.dirs.slice(0, nmIndex + 1 + (isScoped ? 2 : 1)),
                'package.json'
              )
            );
            continue;
          }

          if (module instanceof BundleRefModule) {
            bundleRefExportIds.push(module.ref.exportId);
            continue;
          }

          if (isConcatenatedModule(module)) {
            moduleCount += module.modules.length;
            continue;
          }

          if (isExternalModule(module) || isIgnoredModule(module)) {
            continue;
          }

          throw new Error(`Unexpected module type: ${inspect(module)}`);
        }

        const files = Array.from(referencedFiles).sort(ascending((p) => p));
        const mtimes = new Map(
          files.map((path): [string, number | undefined] => {
            try {
              return [path, compiler.inputFileSystem.statSync(path)?.mtimeMs];
            } catch (error) {
              if (error?.code === 'ENOENT') {
                return [path, undefined];
              }

              throw error;
            }
          })
        );

        bundle.cache.set({
          bundleRefExportIds: bundleRefExportIds.sort(ascending((p) => p)),
          optimizerCacheKey: workerConfig.optimizerCacheKey,
          cacheKey: bundle.createCacheKey(files, mtimes),
          moduleCount,
          workUnits,
          files,
        });

        // write the cache to the compilation so that it isn't cleaned by clean-webpack-plugin
        bundle.cache.writeWebpackAsset(compilation);
      }
    );
  }
}
