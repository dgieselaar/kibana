/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunInferenceAPI } from '@kbn/observability-ai-assistant-plugin/public';
import { defer, from, switchMap } from 'rxjs';
import { DataOnboardingAPIClient } from '../../api';
import { sortAndTruncateAnalyzedFields } from '../../utils/sort_and_truncate_analyzed_fields';

export function generateServiceDescription({
  name,
  sources,
  start,
  end,
  apiClient,
  inference,
  signal,
  connectorId,
}: {
  name: string;
  sources: Array<{ dataset: string; filter?: string }>;
  start: number;
  end: number;
  apiClient: DataOnboardingAPIClient;
  inference: RunInferenceAPI;
  signal: AbortSignal;
  connectorId: string;
}) {
  return defer(() => {
    return from(
      apiClient('POST /internal/data_onboarding/tasks/analyze_sample_documents', {
        signal,
        params: {
          body: {
            start,
            end,
            sources,
          },
        },
      })
    );
  }).pipe(
    switchMap((analysis) => {
      return inference.task('describe_service', {
        connectorId,
        signal,
        system: `
          You are a helpful assistant for Elastic Observability. Your goal
          is to come up with a description of a service, based on the
          analyzed data. You are an expert in Observability and you
          thoughtfully analyze the sampled data.
        `,
        input: `Based on the following sample data from the data sources for
        this service, provide a description of the service. Break it down into
        the following sections. When working on the sections, make sure to list
        or mention the actual things (like metrics, or connections), don't
        talk about it in an abstract or generic way. If they are not available
        in the data, mention that they are not, do not hypothesize about possible
        data that is not there.

        - A description of the service, the language, and a possible
        purpose. The heading for this should be the service name, and the
        service name only.
        - The characteristics of the infrastructure it runs on. E.g., does it
        run on k8s, or docker containers, or simple VMs? Does it run on one
        or many hosts? Does it run on multiple regions or just one?
        - Key metrics to monitor - throughput, latency, failure rate etc. There
        could also be infrastructure metrics for its underlying infrastructure,
        like memory usage, or cpu. Some services also capture metrics for outgoing
        connections, which can be grouped by destination. If there are no metrics
        available, simply mention as much. For these metrics, mention the field
        names. These metrics should either be doc count, or filters & aggregations
        over numerical, categorical or text (patterns) fields. This should be
        generally be timeseries data that you can visualize or alert on.
        - What other services it is talking to, like databases, but also other
        (internal) applications, or 3rd party services.

        The service name is ${name}. The sources are:

        \`\`\`json
        ${JSON.stringify(sources)}
        \`\`\`

        These are the analyzed fields:

        \`\`\`json
        ${JSON.stringify(sortAndTruncateAnalyzedFields(analysis))}
        \`\`\`
        `,
      });
    })
  );
}
