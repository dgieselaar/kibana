/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Module = require('module');

// Mock dependencies
jest.mock('pirates', () => ({
  addHook: jest.fn(),
}));

jest.mock('source-map-support', () => ({
  install: jest.fn(),
}));

jest.mock('./cache', () => ({
  getCache: jest.fn(() => ({
    getKey: jest.fn(),
    getCode: jest.fn(),
    getSourceMap: jest.fn(),
    update: jest.fn(),
  })),
}));

jest.mock('./transforms', () => ({
  TRANSFORMS: {
    default: jest.fn(),
    '.ts': jest.fn(),
  },
}));

describe('@kbn/babel-register', () => {
  let install, installEsm;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Re-require the module to reset the installed flags
    const mod = require('./index');
    install = mod.install;
    installEsm = mod.installEsm;
  });

  describe('install', () => {
    it('should install CommonJS require hook', () => {
      const { addHook } = require('pirates');
      install();
      expect(addHook).toHaveBeenCalled();
    });

    it('should only install once', () => {
      const { addHook } = require('pirates');
      install();
      install();
      expect(addHook).toHaveBeenCalledTimes(1);
    });

    it('should install source map support', () => {
      const sourceMapSupport = require('source-map-support');
      install();
      expect(sourceMapSupport.install).toHaveBeenCalled();
    });
  });

  describe('installEsm', () => {
    it('should register ESM loader when module.register is available', () => {
      const mockRegister = jest.fn();
      Module.register = mockRegister;

      installEsm();

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0]).toContain('esm_loader.js');
    });

    it('should only register once', () => {
      const mockRegister = jest.fn();
      Module.register = mockRegister;

      installEsm();
      installEsm();

      expect(mockRegister).toHaveBeenCalledTimes(1);
    });

    it('should throw error when module.register is not available', () => {
      delete Module.register;

      expect(() => {
        installEsm();
      }).toThrow(/requires Node.js 22\+ with module.register\(\) support/);
    });
  });

  describe('install and installEsm independence', () => {
    it('should allow calling install and installEsm independently', () => {
      const { addHook } = require('pirates');
      const mockRegister = jest.fn();
      Module.register = mockRegister;

      install();
      installEsm();

      expect(addHook).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledTimes(1);
    });

    it('should allow calling installEsm before install', () => {
      const { addHook } = require('pirates');
      const mockRegister = jest.fn();
      Module.register = mockRegister;

      installEsm();
      install();

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(addHook).toHaveBeenCalledTimes(1);
    });
  });
});
