/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import * as fs from 'fs';

import type { Logger } from '@kbn/logging';

import type { SpeedscopeFile } from './types';
import { openProfileInSpeedscope, writeSpeedscopeFile } from './speedscope_io';

jest.mock('execa');

jest.mock('fs', () => ({
  promises: {
    mkdtemp: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockFs = jest.mocked(fs);
const mockExeca = jest.mocked(execa);

function createLogger(): Logger {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
  };

  logger.get.mockReturnValue(logger);

  return logger as unknown as Logger;
}

describe('speedscope IO helpers', () => {
  const profile: SpeedscopeFile = {
    $schema: 'schema',
    shared: {
      frames: [],
    },
    profiles: [],
    activeProfileIndex: 0,
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('writes the profile to a temporary file', async () => {
    const logger = createLogger();

    mockFs.promises.mkdtemp.mockResolvedValue('/tmp');

    const path = await writeSpeedscopeFile({ profile, logger });

    expect(mockFs.promises.mkdtemp).toHaveBeenCalledWith(
      expect.stringContaining('kbn-trace-profile-')
    );
    expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
      `${'/tmp'}/trace-profile.speedscope.json`,
      JSON.stringify(profile)
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Wrote trace profile to'));
    expect(path).toBe('/tmp/trace-profile.speedscope.json');
  });

  it('invokes speedscope via execa when opening the profile', async () => {
    const logger = createLogger();
    mockExeca.command = jest
      .fn()
      .mockResolvedValue(undefined as unknown as execa.ExecaChildProcess);

    await openProfileInSpeedscope({ profilePath: '/profile.json', logger });

    expect(mockExeca.command).toHaveBeenCalledWith('npx speedscope /profile.json');
    expect(logger.info).toHaveBeenCalledWith('Opened speedscope with generated profile');
  });

  it('logs an error if speedscope fails to launch', async () => {
    const logger = createLogger();
    const error = new Error('boom');
    mockExeca.command = jest.fn().mockRejectedValue(error);

    await openProfileInSpeedscope({ profilePath: '/profile.json', logger });

    expect(logger.error).toHaveBeenCalledWith(`Failed to open speedscope: ${error}`);
  });
});
