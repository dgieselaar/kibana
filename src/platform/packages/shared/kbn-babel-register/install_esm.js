/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

let esmInstalled = false;

/**
 * Install ESM loader for transforming ES modules with Babel
 * Uses Node.js module.register() API (Node 22+)
 */
function installESM() {
  if (esmInstalled) {
    return;
  }

  esmInstalled = true;

  // Node 22+ supports module.register()
  if (typeof require('module').register === 'function') {
    const loaderPath = Path.resolve(__dirname, 'esm_loader.js');
    require('module').register(loaderPath);
  } else {
    throw new Error(
      '@kbn/babel-register: installESM() requires Node.js 22+ with module.register() support'
    );
  }
}

module.exports = { installESM };
