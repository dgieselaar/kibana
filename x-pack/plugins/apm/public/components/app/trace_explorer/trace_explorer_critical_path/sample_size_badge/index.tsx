import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SampleSizeBadge({ sampleSize }: { sampleSize: number }) {
  return (
    <div>
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.criticalPath.sampleSize.tooltip',
          {
            defaultMessage: `The calculation of the aggregated critical path is based on a set of sample traces following the selection criteria in the Trace Explorer's search box and the duration selection in the trace distribution chart.`,
          }
        )}
      >
        <EuiBadge iconType="iInCircle" color="hollow">
          {i18n.translate('xpack.apm.criticalPath.sampleSize.badge', {
            defaultMessage: `Based on ${sampleSize} sampled traces`,
          })}
        </EuiBadge>
      </EuiToolTip>
    </div>
  );
}