/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const ES = require('@elastic/elasticsearch');
const _ = require('lodash');

const client = new ES.Client({
  node: 'http://admin:changeme@localhost:9200',
});

const separatedFramesIndex = 'profiling-stackframes-separated';

async function fetchFrames() {
  const traceIdResponse = await client.search({
    index: separatedFramesIndex,
    size: 0,
    request_cache: false,
    aggs: {
      traceIds: {
        terms: {
          field: 'StackTraceID',
          size: 10000,
        },
      },
    },
  });

  const traceIds = _.sampleSize(
    traceIdResponse.aggregations.traceIds.buckets.map((bucket) => bucket.key),
    10000
  );

  let start = performance.now();

  const compositeAgg = await client.search({
    query: {
      bool: {
        filter: [
          {
            terms: {
              StackTraceID: traceIds,
            },
          },
        ],
      },
    },
    index: separatedFramesIndex,
    request_cache: false,
    size: 0,
    filter_path:
      'aggregations.StackTraceID.buckets.latest.top.metrics.FrameID,aggregations.StackTraceID.buckets.key,took',
    preference: 'foo',
    aggs: {
      StackTraceID: {
        composite: {
          sources: [
            {
              StackTraceID: {
                terms: {
                  field: 'StackTraceID',
                },
              },
            },
          ],
          size: 10000,
        },
        aggs: {
          latest: {
            top_metrics: {
              metrics: [
                {
                  field: 'FrameID',
                },
              ],
              size: 20,
              sort: {
                FrameOrder: 'asc',
              },
            },
          },
        },
      },
    },
  });

  console.log(
    'composite',
    performance.now() - start,
    compositeAgg.took,
    Math.round(JSON.stringify(compositeAgg).length / 1024) + 'kb'
  );

  start = performance.now();

  const scriptedMetricAgg = await client.search({
    query: {
      bool: {
        filter: [
          {
            terms: {
              StackTraceID: traceIds,
            },
          },
        ],
      },
    },
    index: separatedFramesIndex,
    request_cache: false,
    size: 0,
    filter_path:
      'aggregations.StackTraceID.buckets.script,FrameID,aggregations.StackTraceID.buckets.key,took',
    preference: 'foo',
    aggs: {
      StackTraceID: {
        composite: {
          sources: [
            {
              StackTraceID: {
                terms: {
                  field: 'StackTraceID',
                },
              },
            },
          ],
          size: 10000,
        },
        aggs: {
          script: {
            scripted_metric: {
              init_script: 'state.frames = []',
              map_script: 'state.frames.add(doc.FrameID.value)',
              combine_script: 'return state.frames',
              reduce_script:
                'def frames = []; for(state in states) { for (frame in state) { frames.add(frame); } } return frames.subList(0, (int)Math.min(frames.size(), 20));',
            },
          },
        },
      },
    },
  });

  console.log(
    'scripted',
    performance.now() - start,
    scriptedMetricAgg.took,
    Math.round(JSON.stringify(scriptedMetricAgg).length / 1024) + 'kb'
  );

  start = performance.now();

  const mget = await client.mget({
    ids: traceIds,
    index: 'profiling-stacktraces',
    filter_path: 'docs._source',
  });

  console.log(
    'mget',
    performance.now() - start,
    Math.round(JSON.stringify(mget).length / 1024) + 'kb'
  );
}

fetchFrames()
  .then(() => console.log('done'))
  .catch((err) => console.error(err));
