/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, ClusterConnectionPool, HttpConnection } from '@elastic/elasticsearch';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import apm from 'elastic-apm-node';
import * as Https from 'https';
import { get, isUndefined, omitBy } from 'lodash';
import LRUCache from 'lru-cache';
import type { AgentFactoryProvider } from './agent_manager';
import { parseClientOptions } from './client_config';
import { createTransport } from './create_transport';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';

const noop = () => undefined;

type MaybeHRTime = ReturnType<NodeJS.HRTime> | undefined;

function getDurationInMs(from: MaybeHRTime, to: MaybeHRTime) {
  if (!from || !to) {
    return undefined;
  }

  const secondDiff = to[0] - from[0];
  const nanoSecondDiff = to[1] - from[1];

  return secondDiff * 1000 + nanoSecondDiff / 1e6;
}

apm.addPatch(['http', 'https'], (httpOrHttps: typeof Https) => {
  const originalGet = httpOrHttps.request.bind(httpOrHttps);
  httpOrHttps.request = (options, callback) => {
    let firstByteAt: MaybeHRTime;
    const startAt: MaybeHRTime = process.hrtime();
    let socketAssignedAt: MaybeHRTime;
    let dnsLookupAt: MaybeHRTime;
    let tcpConnectionAt: MaybeHRTime;
    let tlsHandshakeAt: MaybeHRTime;

    const request = originalGet(options, (response) => {
      response.once('readable', () => {
        firstByteAt = process.hrtime();
      });
      response.once('end', () => {
        const endAt = process.hrtime();

        const span = apm.currentSpan;

        span?.addLabels(
          omitBy(
            {
              network_socket_assigned: getDurationInMs(startAt, socketAssignedAt),
              network_dns_lookup: getDurationInMs(socketAssignedAt, dnsLookupAt),
              network_tcp_connection: getDurationInMs(
                dnsLookupAt || socketAssignedAt,
                tcpConnectionAt
              ),
              network_tls_handshake: getDurationInMs(tcpConnectionAt, tlsHandshakeAt),
              network_first_byte: getDurationInMs(
                tlsHandshakeAt || tcpConnectionAt || socketAssignedAt,
                firstByteAt
              ),
              network_content_transfer: getDurationInMs(firstByteAt, endAt),
              network_total: getDurationInMs(startAt, endAt),
            },
            isUndefined
          )
        );
      });

      if (typeof callback === 'function') {
        callback(response);
      }
    });

    request.on('socket', (socket) => {
      socketAssignedAt = process.hrtime();

      if (socket.readyState === 'opening') {
        socket.once('lookup', () => {
          dnsLookupAt = process.hrtime();
        });
        socket.once('connect', () => {
          tcpConnectionAt = process.hrtime();
        });
        socket.once('secureConnect', () => {
          tlsHandshakeAt = process.hrtime();
        });
      } else {
        dnsLookupAt = tcpConnectionAt = tlsHandshakeAt = process.hrtime();
      }
    });

    return request;
  };

  return httpOrHttps;
});

interface Timings {
  serializationStart?: MaybeHRTime;
  requestStart?: MaybeHRTime;
  deserializationStart?: MaybeHRTime;
}

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
    agentFactoryProvider,
    kibanaVersion,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped, kibanaVersion);
  const KibanaTransport = createTransport({ getExecutionContext });

  const cache = new LRUCache<any, Timings>({
    max: 1000,
  });

  const client = new Client({
    ...clientOptions,
    agent: agentFactoryProvider.getAgentFactory(clientOptions.agent),
    Transport: KibanaTransport,
    Connection: HttpConnection,
    // using ClusterConnectionPool until https://github.com/elastic/elasticsearch-js/issues/1714 is addressed
    ConnectionPool: ClusterConnectionPool,
  });

  client.diagnostic.on('serialization', (err, result) => {
    cache.set(result?.meta.request.id, {
      serializationStart: process.hrtime(),
    });
  });

  client.diagnostic.on('request', (err, result) => {
    const timings = cache.get(result?.meta.request.id);
    if (timings) {
      timings.requestStart = process.hrtime();
      cache.set(result?.meta.request.id, timings);
    }
  });

  client.diagnostic.on('deserialization', (err, result) => {
    const timings = cache.get(result?.requestId);
    if (timings) {
      timings.deserializationStart = process.hrtime();
      cache.set(result?.requestId, timings);
    }
  });

  client.diagnostic.on('response', (err, result) => {
    const timings = cache.get(result?.meta.request.id);
    if (timings) {
      const end = process.hrtime();
      cache.set(result?.meta.request.id, timings);

      const span = apm.currentSpan;

      span?.setLabel(
        'es_serialization',
        getDurationInMs(timings.serializationStart, timings.requestStart)
      );
      span?.setLabel('es_deserialization', getDurationInMs(timings.deserializationStart, end));
      span?.setLabel('es_response_time', getDurationInMs(timings.requestStart, end));

      const took = get(result, 'body.took');
      span?.setLabel('es_took', took);
    }
  });

  const { apisToRedactInLogs = [] } = config;
  instrumentEsQueryAndDeprecationLogger({ logger, client, type, apisToRedactInLogs });

  return client;
};
