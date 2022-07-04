/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import hash from 'object-hash';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../typings/es_schemas/ui/span';
import {
  ICriticalPathItem,
  ICriticalPath,
} from '../../../typings/critical_path';

const ROOT_ID = 'root';

interface ITraceItem {
  name: string;
  id: string;
  parentId?: string;
  start: number;
  end: number;
  span?: Span;
  transaction?: Transaction;
  skew: number;
}

interface ITrace {
  root: ITraceItem;
  childrenByParentId: Record<string, ITraceItem[]>;
}

interface TraceSegment {
  item: ITraceItem;
  intervalStart: number;
  intervalEnd: number;
  parentHash: string;
  depth: number;
  layers: Record<string, string>;
}

export const calculateCriticalPath = (
  criticalPathData: Array<Transaction | Span>
): ICriticalPath => {
  const tracesMap = groupBy(criticalPathData, (item) => item.trace.id);
  const criticalPaths = Object.entries(tracesMap)
    .map((entry) => getTrace(entry[1]))
    .filter((t) => t !== undefined)
    .map((trace) => calculateCriticalPathForTrace(trace!));
  const sampleSize = criticalPaths.length;
  const criticalPath: Record<string, ICriticalPathItem> = {};

  criticalPaths.forEach((cp) => {
    cp?.forEach((cpi) => {
      let obj = criticalPath[cpi.hash];
      if (!obj) {
        criticalPath[cpi.hash] = cpi;
        obj = cpi;
        obj.selfDuration = obj.selfDuration / sampleSize;
        obj.duration = obj.duration / sampleSize;
      } else {
        obj.selfDuration += cpi.selfDuration / sampleSize;
        obj.duration += cpi.duration / sampleSize;
      }
    });
  });

  return {
    items: Object.entries(criticalPath).map((entry) => entry[1]),
    sampleSize,
  };
};

const getId = (item: Transaction | Span) => {
  return item.span
    ? (item as Span).span.id
    : (item as Transaction).transaction.id;
};

const transformItem = (item: Transaction | Span) => {
  const docType = item.span ? 'span' : 'transaction';
  switch (docType) {
    case 'span': {
      const span = item as Span;
      return {
        name: span.span.name,
        span,
        transaction: undefined,
        id: span.span.id,
        parentId: span.parent?.id,
        start: span.timestamp.us,
        end: span.timestamp.us + span.span.duration.us,
        skew: 0,
      };
    }
    case 'transaction':
      const transaction = item as Transaction;
      return {
        name: transaction.transaction.name,
        span: undefined,
        transaction,
        id: transaction.transaction.id,
        parentId: transaction.parent?.id,
        start: transaction.timestamp.us,
        end: transaction.timestamp.us + transaction.transaction.duration.us,
        skew: 0,
      };
  }
};

const getTrace = (
  criticalPathData: Array<Transaction | Span>
): ITrace | undefined => {
  const rootTraceItem = criticalPathData.find((i) => !i.parent?.id);
  if (!rootTraceItem) {
    return undefined;
  }
  const itemsToProcess: Array<{
    parent?: ITraceItem;
    item: Transaction | Span;
  }> = [{ parent: undefined, item: rootTraceItem! }];

  const traceItems: ITraceItem[] = [];
  while (itemsToProcess.length > 0) {
    const toProcess = itemsToProcess.shift();
    if (toProcess) {
      const { parent, item } = toProcess;

      const transformedItem = transformItem(item);

      const skew = getClockSkew(transformedItem, parent);
      transformedItem.skew = skew;
      transformedItem.start += skew;
      transformedItem.end += skew;
      traceItems.push(transformedItem);
      const children = criticalPathData
        .filter((i) => i.parent?.id && i.parent.id === getId(item))
        .map((i) => ({ parent: transformedItem, item: i }));
      if (children?.length) {
        itemsToProcess.push(...children);
      }
    }
  }
  const itemsByParent = groupBy(traceItems, (item) =>
    item.parentId ? item.parentId : ROOT_ID
  );
  const rootItem = itemsByParent[ROOT_ID];
  if (rootItem) {
    return {
      root: rootItem[0],
      childrenByParentId: itemsByParent,
    };
  } else {
    return undefined;
  }
};

const calculateCriticalPathForTrace = (trace: ITrace) => {
  const calculateCriticalPathForChildren: TraceSegment[] = [
    {
      item: trace.root,
      intervalStart: trace.root.start,
      intervalEnd: trace.root.end,
      parentHash: ROOT_ID,
      depth: 1,
      layers: { [0]: ROOT_ID },
    },
  ];

  const criticalPathSegments: ICriticalPathItem[] = [];

  while (calculateCriticalPathForChildren.length > 0) {
    const nextSegment = calculateCriticalPathForChildren.pop();
    if (nextSegment) {
      const result = criticalPathForItem(trace, nextSegment);
      calculateCriticalPathForChildren.push(...result.childrenOnCriticalPath);
      criticalPathSegments.push(result.criticalPathItem);
    }
  }

  const root = {
    hash: ROOT_ID,
    name: ROOT_ID,
    selfDuration: 0,
    duration: trace.root.end - trace.root.start,
    parentHash: '',
    depth: 0,
    layers: { [0]: ROOT_ID },
    docType: 'none',
  };

  return [root, ...criticalPathSegments];
};

const criticalPathForItem = (trace: ITrace, segment: TraceSegment) => {
  let criticalPathDurationSum = 0;
  const item = segment.item;
  const directChildren = trace.childrenByParentId[item.id];

  const childrenOnCriticalPath: TraceSegment[] = [];
  const thisHash = hash({ name: item.name, parent: segment.parentHash });
  const thisLayers = { ...segment.layers, ...{ [segment.depth]: thisHash } };
  if (directChildren && directChildren.length > 0) {
    const orderedChildren = [...directChildren].sort((a, b) => b.end - a.end);
    let scanTimestamp = segment.intervalEnd;
    orderedChildren.forEach((child) => {
      const childStart = Math.max(child.start, segment.intervalStart);
      const childEnd = Math.min(child.end, scanTimestamp);
      if (
        childStart >= scanTimestamp ||
        childEnd < segment.intervalStart ||
        (child.span && child.end > scanTimestamp)
      ) {
        // ignore this child as it is not on the critical path
      } else {
        if (childEnd < scanTimestamp) {
          criticalPathDurationSum += scanTimestamp - childEnd;
        }
        childrenOnCriticalPath.push({
          item: child,
          intervalStart: childStart,
          intervalEnd: childEnd,
          parentHash: thisHash,
          depth: segment.depth + 1,
          layers: thisLayers,
        });
        scanTimestamp = childStart;
      }
    });
    if (scanTimestamp > segment.intervalStart) {
      criticalPathDurationSum += scanTimestamp - segment.intervalStart;
    }
  } else {
    criticalPathDurationSum += segment.intervalEnd - segment.intervalStart;
  }

  return {
    criticalPathItem: {
      hash: thisHash,
      name: item.name,
      selfDuration: criticalPathDurationSum,
      duration: segment.intervalEnd - segment.intervalStart,
      parentHash: segment.parentHash,
      depth: segment.depth,
      layers: thisLayers,
      docType: item.span ? 'span' : item.transaction ? 'transaction' : 'none',
      sampleDoc: item.span ?? item.transaction,
    },
    childrenOnCriticalPath,
  };
};

function getClockSkew(item: ITraceItem, parentItem?: ITraceItem) {
  if (!parentItem) {
    return 0;
  }
  const docType = item.transaction
    ? 'transaction'
    : item.span
    ? 'span'
    : 'none';
  switch (docType) {
    // don't calculate skew for spans and errors. Just use parent's skew
    case 'none':
      return 0;
    case 'span':
      return parentItem.skew;
    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.start;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.start;
      if (offsetStart > 0) {
        const latency =
          Math.max(
            parentItem.end - parentItem.start - (item.end - item.start),
            0
          ) / 2;
        return offsetStart + latency;
      }

      // child transaction starts after parent thus no adjustment is needed
      return 0;
    }
  }
}
