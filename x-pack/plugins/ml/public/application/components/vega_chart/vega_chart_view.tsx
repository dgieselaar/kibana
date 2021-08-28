/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { htmlIdGenerator } from '@elastic/eui';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { parse, View, Warn } from 'vega';
import { expressionInterpreter } from 'vega-interpreter';
// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import { compile, TopLevelSpec } from 'vega-lite/build/vega-lite';
import { Handler } from 'vega-tooltip';

export interface VegaChartViewProps {
  vegaSpec: TopLevelSpec;
}

export const VegaChartView: FC<VegaChartViewProps> = ({ vegaSpec }) => {
  const htmlId = useMemo(() => htmlIdGenerator()(), []);

  useEffect(() => {
    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec, undefined, { ast: true }), { expr: expressionInterpreter })
      .logLevel(Warn)
      .renderer('canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`);

    view.runAsync(); // evaluate and render the view
  }, [vegaSpec]);

  return <div id={htmlId} className="mlVegaChart" data-test-subj="mlVegaChart" />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default VegaChartView;
