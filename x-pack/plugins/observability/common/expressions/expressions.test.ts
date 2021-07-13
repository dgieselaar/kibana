/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InstantVector } from './instant_vector';
import { LabelSet } from './label_set';
import { parse } from './parser';
import { Sample } from './sample';

function evaluate(expr: string, scope: Record<string, any>) {
  const parser = parse(expr);
  return parser.evaluate(scope);
}

function sample(labels: Record<string, string>, value: number) {
  return new Sample(new LabelSet(labels), value);
}

describe('expressions', () => {
  describe('scalar to scalar', () => {
    it('applies arithmetic operators', () => {
      expect(evaluate('2 / 4', {})).toBe(0.5);
      expect(evaluate('2 + 4', {})).toBe(6);
      expect(evaluate('2 - 4', {})).toBe(-2);
      expect(evaluate('2 * 4', {})).toBe(8);
    });

    it('applies comparison operators', () => {
      expect(evaluate('2 > 3', {})).toBe(0);
      expect(evaluate('2 <= 2', {})).toBe(1);
      expect(evaluate('2 < 3', {})).toBe(1);
      expect(evaluate('2 > 4', {})).toBe(0);
    });
  });

  describe('vector to scalar', () => {
    it('applies arithmetic operators', () => {
      const vector = new InstantVector(Date.now(), [
        sample({ foo: 'bar' }, 2),
        sample({ foo: 'baz' }, 3),
      ]);

      const scope = {
        metric: vector,
      };

      expect((evaluate('metric / 2', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        1,
        1.5,
      ]);

      expect((evaluate('metric * 2', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        4,
        6,
      ]);

      expect((evaluate('metric - 2', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        0,
        1,
      ]);

      expect((evaluate('metric + 2', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        4,
        5,
      ]);
    });

    it('applies comparison operators', () => {
      const vector = new InstantVector(Date.now(), [
        sample({ foo: 'bar' }, 2),
        sample({ foo: 'baz' }, 3),
      ]);

      const scope = {
        metric: vector,
      };

      expect((evaluate('metric < 3', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        2,
      ]);

      expect((evaluate('metric < 4', scope) as InstantVector).samples.map((s) => s.value)).toEqual([
        2,
        3,
      ]);

      expect(
        (evaluate('metric <= 3', scope) as InstantVector).samples.map((s) => s.value)
      ).toEqual([2, 3]);

      expect(
        (evaluate('metric >= 3', scope) as InstantVector).samples.map((s) => s.value)
      ).toEqual([3]);

      expect((evaluate('metric > 4', scope) as InstantVector).samples.map((s) => s.value)).toEqual(
        []
      );

      expect(
        (evaluate('metric == 3', scope) as InstantVector).samples.map((s) => s.value)
      ).toEqual([3]);
    });
  });

  describe('vector to vector', () => {
    let memUsed: InstantVector;
    let memTotal: InstantVector;

    beforeEach(() => {
      memUsed = new InstantVector(Date.now(), [
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-outlier' }, 99),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-b' }, 60),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-c' }, 50),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-d' }, 60),
        sample(
          {
            'service.name': 'opbeans-java',
            'host.name': 'host-e',
            'service.environment': 'production',
          },
          40
        ),
        sample(
          {
            'service.name': 'opbeans-java',
            'host.name': 'host-f',
            'service.environment': 'production',
          },
          40
        ),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-outlier' }, 40),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-b' }, 10),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-outlier' }, 90),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-b' }, 60),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-c' }, 60),
      ]);

      memTotal = new InstantVector(Date.now(), [
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-outlier' }, 100),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-b' }, 100),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-c' }, 100),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-d' }, 100),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-e' }, 100),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-f' }, 100),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-outlier' }, 40),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-b' }, 30),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-outlier' }, 100),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-b' }, 100),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-c' }, 90),
      ]);
    });

    it('divides', () => {
      const result = evaluate('memUsed / memTotal', { memUsed, memTotal }) as InstantVector;

      expect(result.samples.map((s) => s.value.toFixed(2))).toEqual([
        '0.99',
        '0.60',
        '0.50',
        '0.60',
        // these values are from the production environment, and should not be included
        // '0.40',
        // '0.40',
        '1.00',
        '0.33',
        '0.90',
        '0.60',
        '0.67',
      ]);
    });

    it('ignores labels when matching', () => {
      const result = evaluate('memUsed / ignoring(service.environment) memTotal', {
        memUsed,
        memTotal,
      }) as InstantVector;

      expect(result.samples.map((s) => s.value.toFixed(2))).toEqual([
        '0.99',
        '0.60',
        '0.50',
        '0.60',
        // now they should be, because we ignored service.environment
        '0.40',
        '0.40',
        '1.00',
        '0.33',
        '0.90',
        '0.60',
        '0.67',
      ]);

      expect(result.samples.filter((s) => 'service.environment' in s.labels.record).length).toBe(0);
    });

    it('keeps all labels for grouping side', () => {
      const result = evaluate('memUsed / ignoring(service.environment) group_left memTotal', {
        memUsed,
        memTotal,
      }) as InstantVector;

      expect(result.samples.map((s) => s.value.toFixed(2))).toEqual([
        '0.99',
        '0.60',
        '0.50',
        '0.60',
        '0.40',
        '0.40',
        '1.00',
        '0.33',
        '0.90',
        '0.60',
        '0.67',
      ]);

      expect(result.samples.filter((s) => 'service.environment' in s.labels.record).length).toBe(2);
    });

    it('supports nested aggregations', () => {
      const result = evaluate(
        '((memUsed / memTotal) / ignoring(host.name) group_left avg by (service.name) (memUsed/memTotal)) >= 1',
        {
          memUsed,
          memTotal,
        }
      ) as InstantVector;

      expect(result.samples.every((s) => s.value >= 1)).toBe(true);
      expect(result.samples.every((s) => s.labels.record['host.name'] === 'host-outlier')).toBe(
        true
      );
    });
  });

  describe('set operators', () => {
    const lhs = new InstantVector(Date.now(), [
      sample(
        {
          'service.name': 'opbeans-java',
        },
        1
      ),
      sample(
        {
          'service.name': 'opbeans-node',
        },
        1
      ),
    ]);

    const rhs = new InstantVector(Date.now(), [
      sample(
        {
          'service.name': 'opbeans-node',
        },
        1
      ),
      sample(
        {
          'service.name': 'opbeans-python',
        },
        1
      ),
    ]);

    it('and', () => {
      const result = evaluate('lhs and rhs', { lhs, rhs }) as InstantVector;
      expect(result.samples.map((s) => s.labels.record)).toEqual([
        { 'service.name': 'opbeans-node' },
      ]);
    });

    it('unless', () => {
      const result = evaluate('lhs unless rhs', { lhs, rhs }) as InstantVector;
      expect(result.samples.map((s) => s.labels.record)).toEqual([
        { 'service.name': 'opbeans-java' },
      ]);
    });

    it('or', () => {
      const result = evaluate('lhs or rhs', { lhs, rhs }) as InstantVector;
      expect(result.samples.map((s) => s.labels.record)).toEqual([
        { 'service.name': 'opbeans-java' },
        { 'service.name': 'opbeans-node' },
        { 'service.name': 'opbeans-python' },
      ]);
    });
  });

  describe('aggregations', () => {
    let cpu: InstantVector;

    beforeEach(() => {
      cpu = new InstantVector(Date.now(), [
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-a' }, 4),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-b' }, 3),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-c' }, 2),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-d' }, 4),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-e' }, 3),
        sample({ 'service.name': 'opbeans-java', 'host.name': 'host-f' }, 2),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-a' }, 3),
        sample({ 'service.name': 'opbeans-node', 'host.name': 'host-b' }, 1),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-a' }, 1),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-b' }, 1),
        sample({ 'service.name': 'opbeans-python', 'host.name': 'host-c' }, 1),
      ]);
    });

    it('avg returns a scalar', () => {
      expect(
        Number(
          evaluate('avg(cpu)', {
            cpu,
          })
        ).toFixed(2)
      ).toBe('2.27');
    });

    it('avg by returns an instant vector and drops other labels', () => {
      const result = evaluate('avg by (service.name) cpu', {
        cpu,
      }) as InstantVector;

      expect(result.samples.map((s) => s.value)).toEqual([3, 2, 1]);

      expect(result.samples[0].labels.record).toEqual({
        'service.name': 'opbeans-java',
      });
    });

    it('avg of max', () => {
      const result = evaluate('avg(max by (service.name) cpu)', {
        cpu,
      }) as number;

      expect(result.toFixed(2)).toBe('2.67');
    });

    it('sum', () => {
      const result = evaluate('sum(cpu)', {
        cpu,
      }) as number;

      expect(result).toBe(25);
    });
  });
});
