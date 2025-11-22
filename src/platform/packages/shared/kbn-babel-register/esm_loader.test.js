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
const { resolve, load } = require('./esm_loader');

// Mock file system for testing
jest.mock('fs');
jest.mock('./cache', () => ({
  getCache: () => ({
    getKey: jest.fn((path, source) => `${path}:${source.length}`),
    getCode: jest.fn(),
    getSourceMap: jest.fn(),
    update: jest.fn(),
  }),
}));

jest.mock('./transforms', () => ({
  TRANSFORMS: {
    default: jest.fn((path, source) => `/* transformed */ ${source}`),
    '.ts': jest.fn((path, source) => `/* ts transformed */ ${source}`),
  },
}));

describe('ESM Loader', () => {
  describe('resolve', () => {
    const mockNextResolve = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockNextResolve.mockResolvedValue({ url: 'mock://resolved' });
    });

    it('should pass through built-in modules to next resolver', async () => {
      const result = await resolve('fs', { parentURL: 'file:///test.js' }, mockNextResolve);
      expect(mockNextResolve).toHaveBeenCalledWith('fs', { parentURL: 'file:///test.js' });
      expect(result).toEqual({ url: 'mock://resolved' });
    });

    it('should pass through node_modules to next resolver', async () => {
      const result = await resolve('lodash', { parentURL: 'file:///test.js' }, mockNextResolve);
      expect(mockNextResolve).toHaveBeenCalledWith('lodash', { parentURL: 'file:///test.js' });
      expect(result).toEqual({ url: 'mock://resolved' });
    });

    it('should try default resolver first for relative paths', async () => {
      await resolve('./module', { parentURL: 'file:///test/index.js' }, mockNextResolve);
      expect(mockNextResolve).toHaveBeenCalled();
    });

    it('should resolve files with extensions when default resolver fails', async () => {
      mockNextResolve.mockRejectedValueOnce(new Error('Not found'));
      Fs.existsSync.mockImplementation((path) => path === '/test/module.ts');
      Fs.statSync.mockImplementation(() => ({ isFile: () => true, isDirectory: () => false }));

      const result = await resolve('./module', { parentURL: 'file:///test/index.js' }, mockNextResolve);

      expect(result.url).toContain('/test/module.ts');
      expect(result.shortCircuit).toBe(true);
    });

    it('should resolve index files in directories', async () => {
      mockNextResolve.mockRejectedValueOnce(new Error('Not found'));
      Fs.existsSync.mockImplementation((path) => {
        return path === '/test/module' || path === '/test/module/index.ts';
      });
      Fs.statSync.mockImplementation((path) => ({
        isFile: () => path.includes('index.ts'),
        isDirectory: () => path === '/test/module',
      }));

      const result = await resolve('./module', { parentURL: 'file:///test/index.js' }, mockNextResolve);

      expect(result.url).toContain('/test/module/index.ts');
      expect(result.shortCircuit).toBe(true);
    });

    it('should try multiple extensions in order', async () => {
      mockNextResolve.mockRejectedValueOnce(new Error('Not found'));
      const existingFile = '/test/module.tsx';
      Fs.existsSync.mockImplementation((path) => path === existingFile);
      Fs.statSync.mockImplementation(() => ({ isFile: () => true, isDirectory: () => false }));

      const result = await resolve('./module', { parentURL: 'file:///test/index.js' }, mockNextResolve);

      expect(result.url).toContain('/test/module.tsx');
      expect(result.shortCircuit).toBe(true);
    });
  });

  describe('load', () => {
    const mockNextLoad = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockNextLoad.mockResolvedValue({ source: 'original', format: 'module' });
      Fs.readFileSync.mockReturnValue('const x = 1;');
    });

    it('should pass through non-file:// URLs', async () => {
      const result = await load('http://example.com/test.js', {}, mockNextLoad);
      expect(mockNextLoad).toHaveBeenCalled();
      expect(result).toEqual({ source: 'original', format: 'module' });
    });

    it('should transform .ts files with babel', async () => {
      const url = 'file:///test/module.ts';
      const result = await load(url, {}, mockNextLoad);

      expect(Fs.readFileSync).toHaveBeenCalledWith('/test/module.ts', 'utf8');
      expect(result.format).toBe('module');
      expect(result.source).toContain('/* ts transformed */');
      expect(result.shortCircuit).toBe(true);
    });

    it('should transform .tsx files with babel', async () => {
      const url = 'file:///test/component.tsx';
      const result = await load(url, {}, mockNextLoad);

      expect(Fs.readFileSync).toHaveBeenCalledWith('/test/component.tsx', 'utf8');
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBe(true);
    });

    it('should transform .js files with babel', async () => {
      const url = 'file:///test/module.js';
      const result = await load(url, {}, mockNextLoad);

      expect(Fs.readFileSync).toHaveBeenCalledWith('/test/module.js', 'utf8');
      expect(result.format).toBe('module');
      expect(result.source).toContain('/* transformed */');
      expect(result.shortCircuit).toBe(true);
    });

    it('should ignore files in node_modules (except @kbn)', async () => {
      const url = 'file:///test/node_modules/lodash/index.js';
      const result = await load(url, {}, mockNextLoad);

      expect(mockNextLoad).toHaveBeenCalled();
      expect(Fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should not ignore @kbn packages', async () => {
      const url = 'file:///test/node_modules/@kbn/utils/index.js';
      const result = await load(url, {}, mockNextLoad);

      expect(Fs.readFileSync).toHaveBeenCalledWith('/test/node_modules/@kbn/utils/index.js', 'utf8');
      expect(result.source).toContain('/* transformed */');
    });

    it('should pass through unsupported file extensions', async () => {
      const url = 'file:///test/data.json';
      const result = await load(url, {}, mockNextLoad);

      expect(mockNextLoad).toHaveBeenCalled();
      expect(Fs.readFileSync).not.toHaveBeenCalled();
    });
  });
});
