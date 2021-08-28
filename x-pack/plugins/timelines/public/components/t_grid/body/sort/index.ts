/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SortColumnTimeline, SortDirection } from '../../../../../common/types/timeline/store';

// TODO: Cleanup this type to match SortColumnTimeline
export { SortDirection };

/** Specifies which column the timeline is sorted on */
export type Sort = SortColumnTimeline;
