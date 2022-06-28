import { Transaction } from "../../../../typings/es_schemas/ui/transaction";
import { Span } from "../../../../typings/es_schemas/ui/span";
import {  groupBy, sortBy } from 'lodash';
import hash from 'object-hash'

const ROOT_ID = 'root';

interface ITraceItem {
    name: string;
    id: string;
    parentId?: string;
    start: number;
    end: number;
    span?: Span;
    transaction?: Transaction;
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
}

export interface ICriticalPathItem {
  hash: string;
  name: string;
  selfDuration: number;
  duration: number;
  parentHash: string;
  isRoot: boolean;
}

export interface ICriticalPath {
  elemetnsByHash: Record<string, ICriticalPathItem>;
  roots: ICriticalPathItem[];
}

export const calculateCriticalPath = (criticalPathData: Array<Transaction | Span>) : ICriticalPath => {
  const tracesMap = groupBy(criticalPathData, (item) => item.trace.id);
  const criticalPaths = Object.entries(tracesMap).map((entry) => getTrace(entry[1])).filter(t => t !== undefined)
    .map(trace => calculateCriticalPathForTrace(trace))
  const numOfcriticalPaths = criticalPaths.length;
  const criticalPath: Record<string, ICriticalPathItem> = {};

  criticalPaths.forEach(cp => {
    cp?.forEach(cpi => {
      var obj = criticalPath[cpi.hash];
      if(!obj){
        criticalPath[cpi.hash] = cpi;
        obj = cpi;
        obj.selfDuration = obj.selfDuration / numOfcriticalPaths
        obj.duration = obj.duration / numOfcriticalPaths
      } else {
        obj.selfDuration += cpi.selfDuration / numOfcriticalPaths;
        obj.duration += cpi.duration / numOfcriticalPaths;
      }
    });
  });
  
  return {
    elemetnsByHash: criticalPath,
    roots: Object.entries(criticalPath).map((entry) => entry[1]).filter(cpi => cpi.isRoot)
  };
};


const getTrace = (criticalPathData: Array<Transaction | Span>) : ITrace | undefined => {
  const traceItems = criticalPathData.map(item => {
    const docType: 'span' | 'transaction' = item.processor.event;
      switch (docType) {
        case 'span': {
          const span = item as Span;
          return {
            name: span.span.name,
            span: span,
            transaction: undefined,
            id: span.span.id,
            parentId: span.parent?.id,
            start: span.timestamp.us,
            end: span.timestamp.us + span.span.duration.us
          };
        }
        case 'transaction':
          const transaction = item as Transaction;
          return {
            name: transaction.transaction.name,
            span: undefined,
            transaction: transaction,
            id: transaction.transaction.id,
            parentId: transaction.parent?.id,
            start: transaction.timestamp.us,
            end: transaction.timestamp.us + transaction.transaction.duration.us
          };
      }
    });


  const itemsByParent = groupBy(traceItems, (item) => (item.parentId ? item.parentId : ROOT_ID));
  const rootItem = itemsByParent[ROOT_ID];
  if(rootItem){
    return {
      root: rootItem[0],
      childrenByParentId: itemsByParent
    };
  } else {
    return undefined;
  }



} 

const calculateCriticalPathForTrace = (trace: ITrace | undefined) => {
  if(trace){
    const calculateCriticalPathForChildren : Array<TraceSegment> = [{
      item: trace.root,
      intervalStart: trace.root.start,
      intervalEnd: trace.root.end,
      parentHash: ROOT_ID
    }];

    const criticalPathSegments : ICriticalPathItem[] = [];

    while( calculateCriticalPathForChildren.length > 0){
      const nextSegment = calculateCriticalPathForChildren.pop();
      if(nextSegment){
        const result = criticalPathForItem(trace, nextSegment)
        calculateCriticalPathForChildren.push(...result.childrenOnCriticalPath);
        criticalPathSegments.push(result.criticalPathItem);
      }
    }

    return criticalPathSegments;
  }
}


const criticalPathForItem = ( trace: ITrace, segment: TraceSegment ) => {
  var criticalPathDurationSum = 0;
  const item = segment.item;
  const directChildren = trace.childrenByParentId[item.id];

  var childrenOnCriticalPath : TraceSegment[] = [];
  const thisHash = hash({'name': item.name, 'parent': segment.parentHash});
  if(directChildren && directChildren.length > 0){
    const orderedChildren = [...directChildren].sort((a,b) => (b.end - a.end));
    var scanTimestamp = segment.intervalEnd;
    orderedChildren.forEach(child => {
      const childStart = Math.max(child.start, segment.intervalStart);
      const childEnd = Math.min(child.end, scanTimestamp);
      if(childStart >= scanTimestamp) {
        // ignore this child as it is not on the critical path
      } else {
        if(childEnd < scanTimestamp){
          criticalPathDurationSum += scanTimestamp - childEnd;
        }
        childrenOnCriticalPath.push({
          item: child,
          intervalStart: childStart,
          intervalEnd: childEnd,
          parentHash: thisHash
        });
        scanTimestamp = childStart;
      }
    });
    if(scanTimestamp > segment.intervalStart){
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
      isRoot: segment.parentHash === ROOT_ID
    },
    childrenOnCriticalPath: childrenOnCriticalPath
  };
};

