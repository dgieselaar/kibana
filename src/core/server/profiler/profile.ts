/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isPromise } from 'util/types';
import Path from 'path';
import Fs from 'fs';
import { uniqueId } from 'lodash';
import { hrtime } from 'process';

const pprof = require('pprof');

export function profile<T>(cb: () => T): T {
  const stopProfiling: ReturnType<typeof pprof['time']['start']> | undefined = pprof.time.start();

  const startTime = hrtime.bigint();

  function record() {
    pprof.encode(stopProfiling()).then((profileBuf: any) => {
      const timestamp = new Date().toISOString();
      const fileName = Path.resolve(__dirname, `../../../../pprof-profile-${timestamp}.pb.gz`);

      const endTime = hrtime.bigint();

      const duration = endTime - startTime;

      const durationInMilliseconds = Math.round((Number(duration) / 1e6) * 10) / 10;

      Fs.writeFile(fileName, profileBuf, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log(
            `Recorded CPU profile for duration of ${durationInMilliseconds}ms.\nInspect with the following command:\npprof -http=: ${fileName}`
          );
        }
      });
    });
  }

  let res: T;

  try {
    res = cb();
  } catch (err) {
    record();
    throw err;
  }

  if (isPromise(res)) {
    res.then(record, record);
  } else {
    record();
  }

  return res;
}
