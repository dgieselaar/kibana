/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Inspired in a discussion found at https://github.com/facebook/jest/issues/5356 as Jest currently doesn't
// offer any other option to preserve symlinks.
//
// It would be available once https://github.com/facebook/jest/pull/9976 got merged.

const Path = require('path');
const Fs = require('fs');
const resolve = require('resolve');
const { REPO_ROOT } = require('@kbn/repo-info');
const { readPackageMap } = require('@kbn/repo-packages');

// Read the package map once at module load.
const pkgMap = readPackageMap();
// Resolve the repo root once to its canonical real path to reduce repeated realpath calls.
const REPO_ROOT_REAL = Fs.realpathSync.native
  ? Fs.realpathSync.native(REPO_ROOT)
  : Fs.realpathSync(REPO_ROOT);

const APM_AGENT_MOCK = Path.resolve(__dirname, 'mocks/apm_agent_mock.ts');
const CSS_MODULE_MOCK = Path.resolve(__dirname, 'mocks/css_module_mock.js');
const STYLE_MOCK = Path.resolve(__dirname, 'mocks/style_mock.js');
const FILE_MOCK = Path.resolve(__dirname, 'mocks/file_mock.js');
const WORKER_MOCK = Path.resolve(__dirname, 'mocks/worker_module_mock.js');

const STATIC_FILE_EXT =
  `jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga`
    .split('|')
    .map((e) => `.${e}`);

// ----------------------------------------------------------------------------
// Resolver performance helpers
// ----------------------------------------------------------------------------

// process-wide memoization cache to avoid repeated "resolve" work
const memo = new Map();

/**
 * Build a stable cache key for a resolution request.
 * We include request, basedir, extensions, and whether defaultResolver is present.
 * @param {string} request
 * @param {import('resolve').SyncOpts & { defaultResolver?: Function }} options
 */
function cacheKey(request, options) {
  const exts = Array.isArray(options.extensions)
    ? options.extensions.join(',')
    : String(options.extensions || '');

  const basedir = options.basedir || '';
  const def = options.defaultResolver ? '1' : '0';
  return `${request}|${basedir}|${exts}|${def}`;
}

// Memoize reads of package.json files to reduce IO from resolve.sync
const readFileMemo = new Map();
function memoizedReadFileSync(p, opts) {
  try {
    const pathStr = String(p);
    const isPkgJson = pathStr.endsWith('package.json');
    // Only memoize package.json reads under the repo root to avoid caching user/home files unexpectedly
    if (!isPkgJson || !pathStr.startsWith(REPO_ROOT)) {
      return Fs.readFileSync(p, opts);
    }

    let enc = 'buffer';
    if (typeof opts === 'string') {
      enc = opts;
    } else if (opts && typeof opts === 'object' && opts.encoding) {
      enc = opts.encoding;
    }
    const key = `${pathStr}|${enc}`;
    if (readFileMemo.has(key)) {
      return readFileMemo.get(key);
    }
    const data = Fs.readFileSync(p, opts);
    readFileMemo.set(key, data);
    return data;
  } catch (e) {
    // fall back to native behavior on any unexpected errors
    return Fs.readFileSync(p, opts);
  }
}

// Memoize realpath operations to avoid repeated kernel calls during resolution
const realpathMemo = new Map();
function memoizedRealpathSync(p) {
  const key = String(p);
  if (realpathMemo.has(key)) {
    const cached = realpathMemo.get(key);
    if (cached && cached.__err) throw cached.__err;
    return cached;
  }
  try {
    const res = Fs.realpathSync.native ? Fs.realpathSync.native(p) : Fs.realpathSync(p);
    realpathMemo.set(key, res);
    return res;
  } catch (e) {
    // Cache the error to avoid retrying repeatedly
    realpathMemo.set(key, { __err: e });
    throw e;
  }
}

// Memoize stat checks and derive isFile/isDirectory from cached stats
const statMemo = new Map();
function getStat(p) {
  const key = String(p);
  if (statMemo.has(key)) return statMemo.get(key);
  try {
    const st = Fs.statSync(p);
    statMemo.set(key, st);
    return st;
  } catch (e) {
    // Cache a sentinel to mark missing paths and avoid repeated syscalls
    const sentinel = null;
    statMemo.set(key, sentinel);
    return sentinel;
  }
}
function memoizedIsFile(filePath) {
  const st = getStat(filePath);
  return !!(st && typeof st.isFile === 'function' && st.isFile());
}
function memoizedIsDirectory(dirPath) {
  const st = getStat(dirPath);
  return !!(st && typeof st.isDirectory === 'function' && st.isDirectory());
}

// Memoize parsed package.json objects; return a shallow copy to avoid mutation by packageFilter leaking into cache
const readPkgMemo = new Map();
function memoizedReadPackageSync(p) {
  const pathStr = String(p);
  const isPkgJson = pathStr.endsWith('package.json');
  let key = pathStr;
  try {
    key = memoizedRealpathSync(pathStr);
  } catch (_) {
    // ignore realpath failures; fall back to raw path as cache key
  }

  if (isPkgJson && key.startsWith(REPO_ROOT) && readPkgMemo.has(key)) {
    const cached = readPkgMemo.get(key);
    return { ...cached };
  }

  const data = memoizedReadFileSync(pathStr, 'utf8');
  const str = typeof data === 'string' ? data : String(data);
  const parsed = JSON.parse(str);

  if (isPkgJson && key.startsWith(REPO_ROOT)) {
    readPkgMemo.set(key, parsed);
    return { ...parsed };
  }

  return parsed;
}

/**
 * Store and return a resolved path in the cache.
 * @param {string} key
 * @param {string} result
 */
function cacheSetAndReturn(key, result) {
  memo.set(key, result);

  return result;
}

// Helper: strip browser field to prefer Node/CJS entries in tests
function noBrowserPackageFilter(pkg) {
  if (pkg && pkg.browser) {
    delete pkg.browser;
  }
  return pkg;
}

// Helper: ensure resolver options include Node/CJS-friendly conditions and exclude 'browser'
function withNodeConditions(opts) {
  const base = { ...opts };
  const existing = Array.isArray(opts.conditions) ? opts.conditions : [];
  const merged = [...new Set([...existing, 'require', 'node', 'default'])].filter(
    (c) => c !== 'browser'
  );
  base.conditions = merged;
  return base;
}

// Ensure Node-default file extensions are present for JS ecosystem packages
function withDefaultExtensions(opts) {
  const base = { ...opts };
  const ex = Array.isArray(opts.extensions) ? opts.extensions.slice() : [];
  const merged = [...new Set([...ex, '.js', '.json', '.node'])];
  base.extensions = merged;
  return base;
}

function resolveKbnPackage(key, request, options) {
  const [, id, ...sub] = request.split('/');
  const pkgDir = pkgMap.get(`@kbn/${id}`);
  if (!pkgDir) {
    throw new Error(
      `unable to resolve pkg import, pkg '@kbn/${id}' is not in the pkg map. Do you need to bootstrap?`
    );
  }
  const targetAbs = Path.resolve(REPO_ROOT, pkgDir, sub.join('/'));
  try {
    const res = resolve.sync(
      targetAbs,
      withDefaultExtensions(
        withNodeConditions({
          basedir: Path.dirname(targetAbs),
          extensions: options.extensions,
          readFileSync: memoizedReadFileSync,
          readPackageSync: memoizedReadPackageSync,
          realpathSync: memoizedRealpathSync,
          isFile: memoizedIsFile,
          isDirectory: memoizedIsDirectory,
          packageFilter: noBrowserPackageFilter,
          preserveSymlinks: false,
        })
      )
    );
    return cacheSetAndReturn(key, res);
  } catch (e) {
    if (options.defaultResolver) {
      try {
        const res = options.defaultResolver(targetAbs, withNodeConditions(options));
        return cacheSetAndReturn(key, res);
      } catch (_) {
        // ignore and rethrow original error below
      }
    }
    throw e;
  }
}

// Resolve a relative request using Node-like semantics with our memoized fs helpers
function resolveRelative(request, basedir, extensions) {
  const exts = Array.isArray(extensions) ? extensions.slice() : [];
  // Ensure Node defaults are present
  for (const e of ['.js', '.json', '.node']) {
    if (!exts.includes(e)) exts.push(e);
  }

  const absBase = Path.resolve(basedir, request);

  // 1) Exact file
  if (memoizedIsFile(absBase)) return absBase;

  // 2) Try with extensions
  for (const e of exts) {
    const cand = absBase + e;
    if (memoizedIsFile(cand)) return cand;
  }

  // 3) Directory -> package.json main/module or index
  if (memoizedIsDirectory(absBase)) {
    const pkgJson = Path.join(absBase, 'package.json');
    if (memoizedIsFile(pkgJson)) {
      try {
        const pkg = JSON.parse(String(memoizedReadFileSync(pkgJson, 'utf8')));
        const mainFields = ['main', 'module', 'exports'];
        for (const field of mainFields) {
          const entry = pkg && pkg[field];
          if (typeof entry === 'string') {
            const entryPath = Path.resolve(absBase, entry);
            if (memoizedIsFile(entryPath)) return entryPath;
            for (const e of exts) {
              const cand = entryPath + e;
              if (memoizedIsFile(cand)) return cand;
            }
          }
        }
      } catch (_) {
        // ignore invalid package.json
      }
    }
    for (const e of exts) {
      const idx = Path.join(absBase, 'index' + e);
      if (memoizedIsFile(idx)) return idx;
    }
  }

  const err = new Error(`Cannot resolve relative module '${request}' from '${basedir}'`);
  err.code = 'MODULE_NOT_FOUND';
  throw err;
}

function resolveRelOrAbs(request, options, key, isRelative) {
  // Relative/absolute, or bare fallback: use resolve with memoized fs
  // Choose a safe basedir: for absolute requests, use the containing directory;
  // for relative, prefer options.basedir with a fallback to REPO_ROOT_REAL; for bare, use REPO_ROOT_REAL.
  const isAbs = Path.isAbsolute(request);
  if (isRelative && options.defaultResolver) {
    try {
      // For relative imports, delegate entirely to Jest first
      const res = options.defaultResolver(request, options);
      return cacheSetAndReturn(key, res);
    } catch (_) {
      // fall through
    }
  }
  let effectiveBasedir;
  if (isAbs) {
    effectiveBasedir = Path.dirname(request);
  } else if (isRelative) {
    // Use the provided basedir as-is; do not fallback to repo root for relative imports.
    // This preserves Node/Jest semantics for relative requires within node_modules.
    effectiveBasedir = options.basedir;
  } else {
    effectiveBasedir = REPO_ROOT_REAL;
  }

  // Fast-path: absolute request that already points to a file
  if (isAbs && memoizedIsFile(request)) {
    return cacheSetAndReturn(key, request);
  }

  // Avoid calling resolve for relative imports without a known basedir
  if (isRelative && !effectiveBasedir) {
    // Special-case: core-js internal relative imports (e.g., '../modules/es.symbol')
    if (request.startsWith('../modules/')) {
      try {
        const coreJsPkgJson = resolve.sync('core-js/package.json', { basedir: REPO_ROOT_REAL });
        const coreJsRoot = Path.dirname(coreJsPkgJson);
        const rel = request.replace(/^\.\.\//, '');
        const absBase = Path.join(coreJsRoot, rel);
        const exts = withDefaultExtensions({ extensions: options.extensions }).extensions;
        if (memoizedIsFile(absBase)) {
          return cacheSetAndReturn(key, absBase);
        }
        for (const e of exts) {
          const cand = absBase + e;
          if (memoizedIsFile(cand)) {
            return cacheSetAndReturn(key, cand);
          }
        }
      } catch (_) {
        // ignore and throw below
      }
    }
    const err = new Error(`Cannot resolve '${request}' without a basedir`);
    // Emulate resolve's error shape for consumers that inspect code
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }

  const resolveOpts = withDefaultExtensions(
    withNodeConditions({
      basedir: effectiveBasedir,
      extensions: options.extensions,
      readFileSync: memoizedReadFileSync,
      readPackageSync: memoizedReadPackageSync,
      realpathSync: memoizedRealpathSync,
      isFile: memoizedIsFile,
      isDirectory: memoizedIsDirectory,
      packageFilter: noBrowserPackageFilter,
      preserveSymlinks: false,
    })
  );
  if (!isRelative) {
    resolveOpts.paths = [Path.join(REPO_ROOT, 'node_modules')];
  }
  try {
    const result = isRelative
      ? resolveRelative(request, effectiveBasedir, resolveOpts.extensions)
      : resolve.sync(request, resolveOpts);
    return cacheSetAndReturn(key, result);
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && options.defaultResolver) {
      try {
        const res = options.defaultResolver(request, {
          ...options,
          basedir: effectiveBasedir,
        });
        return cacheSetAndReturn(key, res);
      } catch (_) {
        // fall through and rethrow original error
      }
    }
    // Additional targeted fallback for core-js internal relative requires
    if (
      e &&
      e.code === 'MODULE_NOT_FOUND' &&
      isRelative &&
      typeof effectiveBasedir === 'string' &&
      effectiveBasedir.includes(`${Path.sep}core-js${Path.sep}`) &&
      request.startsWith('..')
    ) {
      try {
        const idx = effectiveBasedir.lastIndexOf(`${Path.sep}core-js${Path.sep}`);
        const coreJsRoot = effectiveBasedir.slice(0, idx + `${Path.sep}core-js`.length);
        const rel = request.replace(/^\.\.\//, '');
        const base = Path.join(coreJsRoot, rel);
        const exts = withDefaultExtensions({ extensions: options.extensions }).extensions;
        if (memoizedIsFile(base)) {
          return cacheSetAndReturn(key, base);
        }
        for (const ext of exts) {
          const cand = base + ext;
          if (memoizedIsFile(cand)) {
            return cacheSetAndReturn(key, cand);
          }
        }
      } catch (_) {
        // ignore and rethrow original error below
      }
    }
    throw e;
  }
}

// Pre-resolve some hot modules once so we don't traverse node_modules repeatedly.
// We resolve them relative to the repo root so they are stable across calls.
const HOT_MODULE_MAP = (() => {
  const entries = new Map();
  try {
    entries.set('axios', resolve.sync('axios/dist/node/axios.cjs', { basedir: REPO_ROOT_REAL }));
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  try {
    entries.set(
      '@launchdarkly/js-sdk-common',
      resolve.sync('@launchdarkly/js-sdk-common/dist/cjs/index.cjs', { basedir: REPO_ROOT_REAL })
    );
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  try {
    entries.set(
      'ts-api-utils',
      resolve.sync('ts-api-utils/lib/index.cjs', { basedir: REPO_ROOT_REAL })
    );
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  return entries;
})();

/**
 * @param {string} str
 * @returns
 */
function parseRequestOrExtSuffix(str) {
  const rawSuffix = '?raw';
  if (str.endsWith(rawSuffix)) {
    return str.slice(0, -rawSuffix.length);
  }
  return str;
}

/**
 * @param {string} request
 * @param {import('resolve').SyncOpts} options
 * @returns
 */
module.exports = (request, options) => {
  const key = cacheKey(request, options);

  if (memo.has(key)) {
    return memo.get(key);
  }

  if (request === `@elastic/eui`) {
    return cacheSetAndReturn(key, module.exports(`@elastic/eui/test-env`, options));
  }

  if (request.startsWith('@elastic/eui/lib/')) {
    return cacheSetAndReturn(
      key,
      module.exports(request.replace('@elastic/eui/lib/', '@elastic/eui/test-env/'), options)
    );
  }

  if (HOT_MODULE_MAP.has(request)) {
    return cacheSetAndReturn(key, HOT_MODULE_MAP.get(request));
  }

  if (request === `elastic-apm-node`) {
    return cacheSetAndReturn(key, APM_AGENT_MOCK);
  }

  const reqExt = Path.extname(request);
  if (reqExt) {
    const pRequest = parseRequestOrExtSuffix(request);
    const pReqExt = parseRequestOrExtSuffix(reqExt);
    const reqBasename = Path.basename(pRequest, pReqExt);
    if ((pReqExt === '.css' || pReqExt === '.scss') && reqBasename.endsWith('.module')) {
      return cacheSetAndReturn(key, CSS_MODULE_MOCK);
    }

    if (pReqExt === '.css' || pReqExt === '.less' || pReqExt === '.scss') {
      return cacheSetAndReturn(key, STYLE_MOCK);
    }

    if (STATIC_FILE_EXT.includes(pReqExt)) {
      return cacheSetAndReturn(key, FILE_MOCK);
    }

    if (pReqExt === '.worker' && reqBasename.endsWith('.editor')) {
      return cacheSetAndReturn(key, WORKER_MOCK);
    }
  }

  if (request.endsWith('?asUrl')) {
    return cacheSetAndReturn(key, FILE_MOCK);
  }

  // Resolve @kbn/* using repo map with minimal IO
  if (request.startsWith('@kbn/')) {
    return resolveKbnPackage(key, request, options);
  }

  const isRelative = request.startsWith('.') || Path.isAbsolute(request);
  const isBare = !isRelative;

  // Bare third-party modules: use Jest's resolver to honor exports/conditions
  if (isBare && options.defaultResolver) {
    try {
      const res = options.defaultResolver(request, withNodeConditions(options));
      return cacheSetAndReturn(key, res);
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
      // Fall back to resolve.sync below
    }
  }

  return resolveRelOrAbs(request, options, key, isRelative);
};
