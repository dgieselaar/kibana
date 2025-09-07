/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { Streams } from '@kbn/streams-schema';
import { generateSignificantEvents } from '@kbn/streams-ai';
import moment from 'moment';
import { omit } from 'lodash';
import { v4 } from 'uuid';
import { clearStreams } from '../../util/clear_streams';
import { enableStreams } from '../../util/enable_streams';
import { prepartitionStreams } from '../../util/prepartition_streams';
import { withLoghubSynthtrace } from '../../util/with_synthtrace';
import { createStreamsRepositoryCliClient } from '../../util/create_repository_client';
import { getStreamNames } from '../../util/get_stream_names';

runRecipe(
  {
    name: 'generate_sig_events',
    flags: {
      string: ['stream', 'system'],
      boolean: ['apply', 'regenerate'],
      help: `
        --stream      The name of the stream for which events should be generated
        --system      The name of the _system_ for which events should be generated (optional)
        --regenerate  Whether data should be regenerated, or left as-is
        --apply       Store the generated significant events
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    const streams = getStreamNames(flags);

    if (flags.regenerate) {
      await clearStreams({
        esClient,
        kibanaClient,
        signal,
      });

      await enableStreams({
        kibanaClient,
        signal,
      });

      await prepartitionStreams({
        esClient,
        kibanaClient,
        signal,
        filter: streams.map((stream) => stream.split('.')[1]),
      });
    }

    const streamsClient = createStreamsRepositoryCliClient(kibanaClient);

    const getResponse = await streamsClient.fetch(`GET /api/streams/{name} 2023-10-31`, {
      signal,
      params: {
        path: {
          name: String(flags.stream),
        },
      },
    });

    Streams.WiredStream.GetResponse.asserts(getResponse);

    const stream = getResponse.stream;

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'hour').valueOf();

    async function getQueries() {
      const { queries } = await generateSignificantEvents({
        stream,
        start,
        end,
        esClient,
        inferenceClient,
        logger,
        system: flags.system
          ? stream.systems?.find((system) => system.name === flags.system)
          : undefined,
      });

      if (flags.apply) {
        await streamsClient.fetch('PUT /api/streams/{name} 2023-10-31', {
          signal,
          params: {
            path: {
              name: stream.name,
            },
            body: {
              dashboards: getResponse.dashboards,
              queries: queries.map((query) => {
                return {
                  id: v4(),
                  kql: {
                    query: query.kql,
                  },
                  title: query.title,
                };
              }),
              rules: getResponse.rules,
              stream: omit(stream, 'name'),
            },
          },
        });
      }
    }

    if (flags.regenerate) {
      await withLoghubSynthtrace(
        {
          start,
          end,
          esClient,
          logger,
        },
        getQueries
      );
      return;
    }

    await getQueries();
  }
);
