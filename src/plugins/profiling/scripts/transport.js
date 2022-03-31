/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');
const Zlib = require('zlib');
const Stream = require('stream');
const ES = require('@elastic/elasticsearch');
const argv = require('yargs').argv;

const compress = !!argv.compress;
const file = argv.file;

const separatedFramesIndex = 'profiling-stackframes-separated';

const gzip = Zlib.createGunzip();

const fileStream = Fs.createReadStream(Path.resolve(file));

const destination = new Stream.PassThrough();

const client = new ES.Client({
  node: 'http://admin:changeme@localhost:9200',
});

const eventsStream = new Stream.Readable({
  read: () => {},
  objectMode: true,
});

async function reindex() {
  await client.indices.delete({
    index: separatedFramesIndex + '*',
    allow_no_indices: true,
  });

  await client.indices.create({
    index: separatedFramesIndex,
    mappings: {
      _source: {
        enabled: false,
      },
      properties: {
        FrameID: {
          type: 'keyword',
          index: false,
        },
        FrameOrder: {
          type: 'byte',
        },
        StackTraceID: {
          type: 'keyword',
        },
      },
    },
    settings: {
      'index.codec': 'best_compression',
      'index.top_metrics_max_size': 200,
      'index.sort': {
        field: ['StackTraceID', 'FrameID'],
        order: ['asc', 'asc'],
      },
    },
  });

  await client.helpers.bulk({
    datasource: eventsStream,
    flushInterval: 100000,
    concurrency: 5,
    onDocument(doc) {
      const id = doc._id;
      delete doc._id;

      return {
        index: { _index: separatedFramesIndex, _id: id },
      };
    },
    onDrop: (doc) => {
      console.log('dropped', doc);
    },
  });
}

destination.on('data', (chunk) => {
  const lines = chunk.toString().split('\n');

  lines.forEach((str) => {
    try {
      const line = JSON.parse(str);
      const stackTraceId = line._id;
      const source = line._source;

      eventsStream.push({
        ...source,
        _id: stackTraceId,
      });

      const frameIds = source.FrameID;
      let i = 0;
      const l = frameIds.length;
      for (; i < l; i++) {
        const frameId = frameIds[i];
        eventsStream.push({
          FrameID: frameId,
          FrameOrder: i,
          StackTraceID: stackTraceId,
        });
      }
    } catch (err) {}
  });
});

Stream.pipeline(fileStream, ...(compress ? [gzip] : []), destination, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Completed reading file');
  }
});

reindex().catch((err) => {
  console.log(err);
  process.exit(1);
});
