/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '..';
import { ApmFields } from '../lib/apm/apm_fields';
import { BaseSpan } from '../lib/apm/base_span';
import { Span } from '../lib/apm/span';
import { Scenario } from '../scripts/scenario';
import { RunOptions } from '../scripts/utils/parse_run_cli_flags';

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const spanNames = [
  'calculate',
  'serialize',
  'encode',
  'doSomething',
  'execute',
  'write',
  'readText',
];

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const instance = apm.service('my-service', 'production', 'java').instance('instance-a');

      const makeSubTree = (
        depth: number,
        width: number,
        timestamp: number,
        duration: number,
        index: number,
        parentPath: string,
        rootCausePath?: string,
        rootCauseDuration?: number
      ): BaseSpan => {
        const thisPath = `${parentPath}:${depth}-${index}`;

        if (depth <= 0) {
          return instance.span(`Operation D${depth}`, 'db').timestamp(timestamp).duration(duration);
        } else {
          const childrenAreParlallel = depth % 2 === 0;

          const selfTime = depth > 0 ? Math.floor(duration / 10) + getRandomInt(duration / 15) : 0;
          const childrenDuration = duration - selfTime;
          const numChildren =
            depth > 0
              ? 1 + Math.min(getRandomInt(width), getRandomInt(width), getRandomInt(width))
              : 0;

          const getParallelChildren = () => {
            return [...new Array(numChildren)].map((_, i) => {
              const childDuration = Math.floor(0.6 * duration) + getRandomInt(duration / 2);
              const childStart = getRandomInt(1.1 * duration - childDuration);

              const childPath = `${thisPath}:${depth - 1}-${i}`;
              if (rootCausePath && rootCauseDuration && rootCausePath?.startsWith(childPath)) {
                return makeSubTree(
                  depth - 1,
                  width,
                  timestamp + (duration - childDuration - 1),
                  childDuration,
                  i,
                  thisPath,
                  rootCausePath,
                  rootCauseDuration
                );
              } else {
                return makeSubTree(
                  depth - 1,
                  width,
                  timestamp + childStart,
                  childDuration,
                  i,
                  thisPath
                );
              }
            });
          };

          const getSequenceChildren = () => {
            let nextChildStart = Math.floor(selfTime / numChildren);
            let nextChildDuration =
              Math.floor(childrenDuration / (numChildren + 1)) +
              getRandomInt(childrenDuration / (2 * numChildren));
            let remainingChildrenDuration = childrenDuration;
            return [...new Array(numChildren)].map((_, i) => {
              const childStart = nextChildStart;
              const childDuration = nextChildDuration;
              remainingChildrenDuration -= childDuration;
              nextChildStart = childStart + childDuration + Math.floor(selfTime / numChildren);
              nextChildDuration =
                i + 1 >= numChildren - 1
                  ? remainingChildrenDuration
                  : Math.floor(
                      (0.7 + 0.6 * Math.random()) *
                        (remainingChildrenDuration / (numChildren - i - 1))
                    );
              const childPath = `${thisPath}:${depth - 1}-${i}`;
              if (rootCausePath && rootCausePath?.startsWith(childPath)) {
                return makeSubTree(
                  depth - 1,
                  width,
                  timestamp + (duration - childDuration - 1),
                  childDuration,
                  i,
                  thisPath,
                  rootCausePath,
                  rootCauseDuration
                );
              } else {
                return makeSubTree(
                  depth - 1,
                  width,
                  timestamp + childStart,
                  childDuration,
                  i,
                  thisPath
                );
              }
            });
          };

          const children = childrenAreParlallel ? getParallelChildren() : getSequenceChildren();

          const spanName =
            rootCausePath && rootCausePath?.startsWith(thisPath)
              ? `Operation D${depth} - I${index}`
              : spanNames[1 + getRandomInt(spanNames.length - 1)];
          return instance
            .span(spanName, 'custom')
            .timestamp(timestamp)
            .duration(duration + (rootCauseDuration ?? 0))
            .children(...children);
        }
      };

      const generateFastTrace = (timestamp: number) => {
        const slowTrace = getRandomInt(10) >= 7;
        const traceDuration = 500 + getRandomInt(500);
        const selfTime = Math.floor(traceDuration / 10) + getRandomInt(traceDuration / 20);
        const childDuration = traceDuration - selfTime;
        const childStart = Math.floor(selfTime / 3) + getRandomInt(selfTime / 3);
        const maxDepth = 9;
        const transactionName = 'MyTransaction';
        if (slowTrace) {
          const rootCausePath = 'Tx:9-0:8-0:7-0:6-0:5-0:4-0';
          const rootCauseDuration = 5000 + getRandomInt(2000);
          return instance
            .transaction(transactionName)
            .timestamp(timestamp)
            .duration(traceDuration + rootCauseDuration)
            .children(
              makeSubTree(
                maxDepth,
                5,
                timestamp + childStart,
                childDuration,
                0,
                'Tx',
                rootCausePath,
                rootCauseDuration
              )
            );
        } else {
          return instance
            .transaction(transactionName)
            .timestamp(timestamp)
            .duration(traceDuration)
            .children(makeSubTree(maxDepth, 5, timestamp + childStart, childDuration, 0, 'Tx'));
        }
      };

      return range
        .interval('30s')
        .rate(20)
        .generator((timestamp) => generateFastTrace(timestamp));
    },
  };
};

export default scenario;
