/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { add, mean } from 'lodash';
import { ValuesType } from 'utility-types';
import { VectorCardinality } from './constants';
import { InstantVector } from './instant_vector';
import { parse } from './parser';
import { Sample } from './sample';

enum MetricType {
  Scalar = 'scalar',
  InstantVector = 'instant_vector',
}

interface ScalarDescriptor {
  type: MetricType.Scalar;
  values?: Map<number, number>;
}
interface InstantVectorDescriptor {
  type: MetricType.InstantVector;
  labels: string[];
  values?: Map<number, InstantVector>;
}

interface Metrics {
  [x: string]: ScalarDescriptor | InstantVectorDescriptor;
}

export class TimeseriesMatrix<TMetrics extends Metrics> {
  private vectors: Map<string, Map<number, InstantVector>>;

  constructor(metrics: TMetrics) {
    this.vectors = new Map();
    // eslint-disable-next-line guard-for-in
    for (const metricName in metrics) {
      this.vectors.set(metricName, metrics[metricName].values ?? new Map());
    }
  }

  push<TName extends keyof TMetrics & string>(name: TName, time: number, sample: Sample<any>) {
    const vectorsForMetricName = this.vectors.get(name);
    if (!vectorsForMetricName) {
      throw new Error(`No vectors found for ${name}`);
    }

    if (!vectorsForMetricName.has(time)) {
      vectorsForMetricName.set(time, new InstantVector(time, []));
    }

    const vector = vectorsForMetricName.get(time)!;

    vector.push(sample);

    return this;
  }

  private getMapByTime() {
    const byTime: Map<number, Map<string, InstantVector | number>> = new Map();

    this.vectors.forEach((timeMap, name) => {
      timeMap.forEach((vector, time) => {
        if (!byTime.has(time)) {
          byTime.set(time, new Map());
        }
        byTime.get(time)!.set(name, vector);
      });
    });

    return Array.from(byTime.values());
  }

  evaluate(expr: string): Array<[number, InstantVector | number]> {
    const parser = parse(expr);

    return this.getMapByTime().map((metricMap, time) => {
      const mapAsObject = Object.fromEntries(metricMap);
      return [time, parser.evaluate(mapAsObject)];
    });
  }

  transform<TReturn>(
    cb: (
      metrics: {
        [key in keyof TMetrics & string]: TMetrics[key] extends InstantVectorDescriptor
          ? InstantVector<
              Record<ValuesType<TMetrics[key]['labels']> & string, string>,
              false,
              [],
              [],
              VectorCardinality.OneToOne,
              false,
              [],
              false
            >
          : number;
      }
    ) => TReturn
  ): Array<[number, TReturn]> {
    return this.getMapByTime().map((metricMap, time) => {
      return [time, cb(metricMap)];
    });
  }
}

const matrix = new TimeseriesMatrix({
  foo: {
    type: MetricType.InstantVector,
    labels: ['service.name' as const, 'service.environment' as const, 'transaction.type' as const],
  },
  baz: {
    type: MetricType.InstantVector,
    labels: ['service.name' as const, 'service.environment' as const],
  },
  bar: { type: MetricType.Scalar },
});

const result = matrix.transform(({ foo, baz }) => {
  const right = baz.on('service.name').groupLeft('transaction.type');
  const next = vector.by('service.name').aggregate(mean);

  return next.aggregate(mean);
});
