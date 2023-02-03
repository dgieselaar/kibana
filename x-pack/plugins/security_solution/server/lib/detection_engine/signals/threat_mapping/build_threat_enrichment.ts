/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalsEnrichment } from '../types';
import {
  enrichSignalThreatMatches,
  getSignalMatchesFromThreatList,
} from './enrich_signal_threat_matches';
import type { BuildThreatEnrichmentOptions } from './types';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getAllThreatListHits } from './get_threat_list';

// we do want to make extra requests to the threat index to get enrichments from all threats
// previously we were enriched alerts only from `currentThreatList` but not all threats
export const buildThreatEnrichment = ({
  ruleExecutionLogger,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatQuery,
  pitId,
  reassignPitId,
  listClient,
  exceptionFilter,
  threatMapping,
  runtimeMappings,
}: BuildThreatEnrichmentOptions): SignalsEnrichment => {
  return async (signals) => {
    const threatFiltersFromEvents = buildThreatMappingFilter({
      threatMapping,
      threatList: signals,
      entryKey: 'field',
      allowedFieldsForTermsQuery: {
        source: {},
        threat: {},
      },
    });

    const threatListHits = await getAllThreatListHits({
      esClient: services.scopedClusterClient.asCurrentUser,
      threatFilters: [...threatFilters, threatFiltersFromEvents],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      ruleExecutionLogger,
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
        fields: undefined,
      },
      pitId,
      reassignPitId,
      runtimeMappings,
      listClient,
      exceptionFilter,
    });

    const signalMatches = getSignalMatchesFromThreatList(threatListHits);

    return enrichSignalThreatMatches(
      signals,
      () => Promise.resolve(threatListHits),
      threatIndicatorPath,
      signalMatches
    );
  };
};
