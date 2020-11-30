/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console*/

import fs, { readFile as readFileAsync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { argv } from 'yargs';
import {
  isArray,
  isBoolean,
  isDate,
  chunk,
  merge,
  isPlainObject,
} from 'lodash';
import { v4 } from 'uuid';
import { getEsClient } from '../shared/get_es_client';
import { parseIndexUrl } from '../shared/parse_index_url';

const readFile = promisify(readFileAsync);

async function run() {
  const target = argv.target as string | undefined;

  if (!target) {
    throw new Error('--target is missing');
  }

  const dir = argv.dir as string | undefined;

  if (!dir) {
    throw new Error('--dir is missing');
  }

  const clientOptions = parseIndexUrl(target);

  const client = getEsClient({ node: clientOptions.node });

  const files = fs.readdirSync(dir);

  console.log(`Reading ${files.length} files`);

  const sessionCountByUserId: Record<string, number> = {};

  const eventsPerDay = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(path.join(dir, file), {
        encoding: 'utf-8',
      });
      const visitsFromFile = text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)) as Array<
        Record<string, unknown> & { hits: Array<Record<string, unknown>> }
      >;

      const eventsFromFile = visitsFromFile.flatMap((visit) => {
        const {
          hits,
          visitId,
          fullVisitorId,
          visitStartTime,
          visitNumber,
          totals,
          ...rest
        } = visit;

        const sessionStartTime = parseInt(String(visitStartTime), 10) * 1000;

        const userId = String(fullVisitorId);

        // generate a random session id because visitId is unreliable
        const sessionId = v4();

        const sessionSeq = (sessionCountByUserId[userId] ?? 0) + 1;
        sessionCountByUserId[userId] = sessionSeq;

        const sharedSessionData = {
          session: {
            time: {
              start: sessionStartTime,
            },
            seq: sessionSeq,
            id: sessionId,
          },
          user: {
            id: fullVisitorId,
          },
        };

        const mappedHits = hits.map((hit) => {
          const { hitNumber, time, type, ...hitRest } = hit;

          return merge({}, sharedSessionData, {
            ...hitRest,
            event: {
              category: String(type).toLowerCase(),
            },
            '@timestamp': sessionStartTime + parseInt(String(time), 10),
            hit: {
              seq: parseInt(hitNumber as string, 10),
            },
          });
        });

        const sessionEndTime = mappedHits[mappedHits.length - 1]['@timestamp'];

        return [
          merge({}, sharedSessionData, rest, {
            event: {
              category: 'session_start',
            },
            '@timestamp': sessionStartTime,
            hit: {
              seq: 0,
            },
          }),
          ...mappedHits,
          merge({}, sharedSessionData, rest, {
            event: {
              category: 'session_end',
            },
            hit: {
              seq: mappedHits.length,
            },
            '@timestamp': sessionEndTime,
            session: {
              end: sessionEndTime,
              totals,
            },
          }),
        ];
      });

      return eventsFromFile;
    })
  );

  function getPropertiesOfMapping(record: Record<string, unknown>) {
    return {
      properties: Object.keys(record).reduce((prev, key) => {
        let value: unknown = record[key];

        if (isArray(value)) {
          value = value[0];
        }

        if (value === undefined) {
          return prev;
        }

        let mapping: any;

        if (isDate(value)) {
          mapping = { type: 'date' };
        } else if (isBoolean(value)) {
          mapping = { type: 'boolean' };
        } else if (typeof value === 'number') {
          mapping = { type: 'long' };
        } else if (typeof value === 'string') {
          mapping =
            parseInt(value, 10).toString() === value
              ? { type: 'long' }
              : { type: 'keyword' };
        } else if (isPlainObject(value)) {
          mapping = getPropertiesOfMapping(value as Record<string, unknown>);
        } else {
          mapping = { type: 'keyword' };
        }

        return {
          ...prev,
          [key]: mapping,
        };
      }, {}),
    };
  }

  console.log('Inferring mappings from data of first day');

  const mappings = eventsPerDay[0].reduce((prev, event) => {
    return merge({}, prev, getPropertiesOfMapping(event), {
      properties: {
        event: {
          properties: {
            category: {
              type: 'keyword',
            },
          },
        },
        session: {
          properties: {
            id: {
              type: 'keyword',
            },
            time: {
              properties: {
                start: {
                  type: 'date',
                },
                end: {
                  type: 'date',
                },
              },
            },
            seq: {
              type: 'long',
            },
          },
        },
        '@timestamp': {
          type: 'date',
        },
        hit: {
          properties: {
            seq: {
              type: 'long',
            },
          },
        },
        user: {
          properties: {
            id: {
              type: 'keyword',
            },
          },
        },
      },
    });
  }, {});

  console.log(JSON.stringify(mappings, null, 2));

  console.log('Checking if index exists');

  const indexExists = (
    await client.indices.exists({
      index: clientOptions.index,
    })
  ).body;

  if (indexExists) {
    console.log('Deleting existing index');
    await client.indices.delete({
      index: clientOptions.index,
    });
  }

  console.log('Creating index with mapping');

  await client.indices.create({
    index: clientOptions.index,
    body: {
      settings: {
        index: {
          number_of_replicas: 0,
        },
      },
      mappings,
    },
  });

  const events = eventsPerDay.flat();

  console.log(`Uploading ${events.length} events`);

  await chunk(events, 1000).reduce(async (prev, batch, index, { length }) => {
    await prev;

    console.log(`Uploading batch ${index + 1}/${length}`);

    const response = await (client as any)?.bulk({
      refresh: 'wait_for',
      body: batch.flatMap((doc) => [
        { index: { _index: clientOptions.index } },
        doc,
      ]),
    });

    const errors = response.body.items.filter(
      (item: any) => 'error' in item.index
    );

    if (errors.length) {
      console.log(
        `Encountered ${errors.length} errors uploading batch ${index + 1}`
      );
      console.log(errors.map((error: any) => error.index.error));
    }
  }, Promise.resolve());
}

run().catch((err) => {
  console.log(err);
  process.exit(1);
});
