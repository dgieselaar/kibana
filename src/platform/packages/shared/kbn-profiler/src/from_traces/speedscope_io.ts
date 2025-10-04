/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import execa from 'execa';
import type { Logger } from '@kbn/logging';

import type { SpeedscopeFile } from './types';

export async function writeSpeedscopeFile({
  profile,
  logger,
}: {
  profile: SpeedscopeFile;
  logger: Logger;
}): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kbn-trace-profile-'));
  const filePath = path.join(tempDir, `trace-profile.speedscope.json`);
  await fs.writeFile(filePath, JSON.stringify(profile));
  logger.info(`Wrote trace profile to ${filePath}`);
  return filePath;
}

export async function openProfileInSpeedscope({
  profilePath,
  logger,
}: {
  profilePath: string;
  logger: Logger;
}) {
  try {
    await execa.command(`npx speedscope ${profilePath}`);
    logger.info('Opened speedscope with generated profile');
  } catch (error) {
    logger.error(`Failed to open speedscope: ${error}`);
  }
}
