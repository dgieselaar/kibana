import React, { useMemo } from 'react';
import {
  Chart,
  Datum,
  Partition,
  PartitionLayout,
  PrimitiveValue,
  Settings,
  TooltipInfo,
  PartialTheme,
} from '@elastic/charts';

import { useChartTheme } from '@kbn/observability-plugin/public';
import { useTheme } from '../../../../hooks/use_theme';
import { ICriticalPathItem } from '../cpa_helper';


export const CriticalPathFlamegraph = ({
  criticalPath,
}: {
  criticalPath: ICriticalPathItem[];
}) => {
  const theme = useTheme();

  const chartSize = {
    //height: layers.length * 20,
    width: '100%',
  };

  const chartTheme = useChartTheme();
  const themeOverrides: PartialTheme = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    partition: {
      fillLabel: {
        fontFamily: theme.eui.euiCodeFontFamily,
        clipText: true,
      },
      fontFamily: theme.eui.euiCodeFontFamily,
      minFontSize: 9,
      maxFontSize: 9,
    },
  };

  return (
    <></>
    /*
    <Chart size={chartSize}>
      <Settings
        theme={[themeOverrides, ...chartTheme]}
        
        tooltip={{
          customTooltip: (info) => (
            <CustomTooltip
              {...info}
              valueUnit={valueUnit}
              nodes={data?.nodes ?? {}}
            />
          ),
        }}
      />
      <Partition
        id="profile_graph"
        data={points}
        layers={layers}
        drilldown
        maxRowCount={1}
        layout={PartitionLayout.icicle}
        valueAccessor={(d: Datum) => d.value as number}
        valueFormatter={() => ''}
      />
    </Chart>
    */
  );
};
