/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_MAX_DOCS } from './constants';
import { createTraceAccumulator } from './trace_accumulator';
import { buildSpeedscopeFile } from './speedscope_builder';
import { openProfileInSpeedscope, writeSpeedscopeFile } from './speedscope_io';
import {
  buildBaseFilters,
  discoverTraceIndices,
  fetchDocumentsBreadthFirst,
  fetchDocumentsWithSlices,
  fetchTraceIds,
  fetchTotalDocs,
} from './trace_fetch';
import type { CreateProfileFromTracesOptions } from './types';

export async function createProfileFromTraces(
  options: CreateProfileFromTracesOptions
): Promise<void> {
  const {
    esClient,
    logger,
    kql,
    eventsKql,
    start,
    end,
    maxDocs = DEFAULT_MAX_DOCS,
    signal,
  } = options;

  if (start >= end) {
    throw new Error('Expected start to be less than end');
  }

  const indices = await discoverTraceIndices(esClient, logger);
  if (!indices.length) {
    logger.warn('No trace data streams discovered matching traces-apm*');
    return;
  }

  logger.info(`Discovered ${indices.length} trace data streams`);

  const traceIdFilters = buildBaseFilters({ kql, start, end });

  const traceIds = await fetchTraceIds({ esClient, indices, filters: traceIdFilters, logger });

  if (!traceIds.length) {
    logger.warn('No trace ids found for the provided query');
    return;
  }

  logger.info(`Selected ${traceIds.length} trace ids`);

  const eventFilters = buildBaseFilters({ kql: eventsKql, start, end });

  const totalDocs = await fetchTotalDocs({ esClient, indices, filters: eventFilters, traceIds });

  if (totalDocs === 0) {
    logger.warn('Selected trace ids resulted in zero documents');
    return;
  }

  logger.info(`Preparing to retrieve ${totalDocs} documents`);

  const accumulator = createTraceAccumulator({ logger, maxDocs });

  if (totalDocs > maxDocs) {
    logger.info(
      `Total docs ${totalDocs} exceeds max threshold ${maxDocs}, performing breadth-first retrieval`
    );
    await fetchDocumentsBreadthFirst({
      esClient,
      indices,
      filters: eventFilters,
      traceIds,
      accumulator,
      logger,
      maxDocs,
    });
  } else {
    logger.info('Total docs within threshold, using sliced search');
    await fetchDocumentsWithSlices({
      esClient,
      indices,
      filters: eventFilters,
      traceIds,
      accumulator,
      logger,
      expectedDocs: totalDocs,
    });
  }

  if (accumulator.count === 0) {
    logger.warn('No documents collected after retrieval');
    return;
  }

  const speedscopeFile = buildSpeedscopeFile(accumulator, logger, signal);

  if (!speedscopeFile) {
    logger.warn('No profile entries were generated from the collected trace data');
    return;
  }

  const totalFrames = speedscopeFile.profiles.reduce(
    (sum, profile) => sum + profile.events.filter((event) => event.type === 'O').length,
    0
  );
  const totalDurationUs = Math.max(...speedscopeFile.profiles.map((profile) => profile.endValue));
  const durationMs = totalDurationUs / 1_000;
  logger.info(
    `Built Speedscope evented profile across ${
      speedscopeFile.profiles.length
    } track(s) with ${totalFrames} frames covering approximately ${durationMs.toFixed(2)} ms`
  );

  const profilePath = await writeSpeedscopeFile({ profile: speedscopeFile, logger });

  await openProfileInSpeedscope({ profilePath, logger });
}
