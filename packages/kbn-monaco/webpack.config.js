/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');

const createLangWorkerConfig = (lang) => {
  let entry;
  switch (lang) {
    case 'default':
      entry = 'monaco-editor/esm/vs/editor/editor.worker.js';
      break;
    case 'json':
      entry = `monaco-editor/esm/vs/language/json/json.worker.js`;
      break;
    case 'typescript':
      entry = `monaco-editor/esm/vs/language/typescript/ts.worker.js`;
      break;

    default:
      entry = path.resolve(__dirname, 'src', lang, 'worker', `${lang}.worker.ts`);
      break;
  }

  return {
    mode: 'production',
    entry,
    output: {
      path: path.resolve(__dirname, 'target_web'),
      filename: `${lang}.editor.worker.js`,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
    },
    stats: 'errors-only',
    module: {
      rules: [
        {
          test: /\.(js|ts)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        },
      ],
    },
  };
};

module.exports = [
  createLangWorkerConfig('xjson'),
  createLangWorkerConfig('painless'),
  createLangWorkerConfig('default'),
  createLangWorkerConfig('json'),
  createLangWorkerConfig('typescript'),
];
