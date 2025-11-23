/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export class StreamsService {
  constructor(private readonly kibanaClient: KibanaClient, private readonly signal: AbortSignal) {}

  public async listStreams(): Promise<Streams.all.Definition[]> {
    const response = await this.kibanaClient.fetch<{ streams: Streams.all.Definition[] }>(
      '/api/streams',
      {
        method: 'GET',
        signal: this.signal,
      }
    );

    return response.streams;
  }
}
