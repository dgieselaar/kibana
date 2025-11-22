/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');
const { pathToFileURL } = require('url');

const { getCache } = require('./cache');
const { TRANSFORMS } = require('./transforms');

const cache = getCache();

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

const IGNORE_PATTERNS = [
  // ignore paths matching `/node_modules/{a}`, unless `a` is "@kbn"
  /[\/\\]node_modules[\/\\](?!@kbn)([^\/\\]+)[\/\\]/,

  // ignore packages with "babel" in their names
  /[\/\\]packages[\/\\]([^\/\\]+-)?babel(-[^\/\\]+)?[\/\\]/,
  // ignore babel plugins
  /lazy_babel_plugin\.js$/,

  // ignore paths matching `/canvas/canvas_plugin/`
  /[\/\\]canvas[\/\\]canvas_plugin[\/\\]/,
];

function shouldIgnore(path) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(path));
}

/**
 * Resolve hook for ESM imports
 * Attempts to resolve imports by adding file extensions and checking for index files
 */
async function resolve(specifier, context, nextResolve) {
  // Let Node.js handle built-ins and node_modules by default
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return nextResolve(specifier, context);
  }

  // Try to resolve with the default resolver first
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // If default resolution fails, try adding extensions
  }

  const { parentURL } = context;
  if (!parentURL) {
    return nextResolve(specifier, context);
  }

  // Convert parent URL to path
  const parentPath = parentURL.startsWith('file://') ? new URL(parentURL).pathname : parentURL;
  const parentDir = Path.dirname(parentPath);

  // Resolve the specifier relative to parent
  const basePath = Path.resolve(parentDir, specifier);

  // Try resolving as a file with extensions
  for (const ext of EXTENSIONS) {
    const filePath = basePath + ext;
    if (Fs.existsSync(filePath) && Fs.statSync(filePath).isFile()) {
      return {
        url: pathToFileURL(filePath).href,
        shortCircuit: true,
      };
    }
  }

  // Try resolving as a directory with index files
  if (Fs.existsSync(basePath) && Fs.statSync(basePath).isDirectory()) {
    for (const indexFile of INDEX_FILES) {
      const indexPath = Path.join(basePath, indexFile);
      if (Fs.existsSync(indexPath) && Fs.statSync(indexPath).isFile()) {
        return {
          url: pathToFileURL(indexPath).href,
          shortCircuit: true,
        };
      }
    }
  }

  // Fall back to default resolver
  return nextResolve(specifier, context);
}

/**
 * Load hook for ESM imports
 * Transforms the loaded file using Babel if it's not ignored
 */
async function load(url, context, nextLoad) {
  // Only handle file:// URLs
  if (!url.startsWith('file://')) {
    return nextLoad(url, context);
  }

  const path = new URL(url).pathname;

  // Check if we should ignore this file
  if (shouldIgnore(path)) {
    return nextLoad(url, context);
  }

  // Check if this is a file we should transform
  const ext = Path.extname(path);
  if (!['.js', '.ts', '.tsx', '.jsx', '.text', '.peggy'].includes(ext)) {
    return nextLoad(url, context);
  }

  // Load the source code
  const source = Fs.readFileSync(path, 'utf8');

  // Get the appropriate transform for this file type
  const transform = (Object.hasOwn(TRANSFORMS, ext) && TRANSFORMS[ext]) || TRANSFORMS.default;

  // Transform the code
  const transformedCode = transform(path, source, cache);

  return {
    format: 'module',
    source: transformedCode,
    shortCircuit: true,
  };
}

module.exports = { resolve, load };
