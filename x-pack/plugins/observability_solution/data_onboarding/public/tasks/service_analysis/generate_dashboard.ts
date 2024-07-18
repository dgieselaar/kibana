/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createScreenContextAction,
  InferenceTaskCompleteEvent,
  InferenceTaskEventType,
  MessageAddEvent,
  MessageRole,
  onlyTaskCompleteEvents,
  RunInferenceAPI,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { defer, filter, from, map, switchMap, toArray } from 'rxjs';
import { correctCommonEsqlMistakes } from '@kbn/observability-ai-assistant-plugin/public';
import { DataOnboardingAPIClient } from '../../api';
import { ExtractedService } from '../../hooks/use_extracted_services';
import { sortAndTruncateAnalyzedFields } from '../../utils/sort_and_truncate_analyzed_fields';

export function generateDashboard({
  name,
  description,
  sources,
  start,
  end,
  apiClient,
  inference,
  signal,
  connectorId,
}: {
  name: string;
  description: string;
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
      const analysisForLlm = sortAndTruncateAnalyzedFields(analysis);

      return inference
        .task('plan_queries', {
          connectorId,
          signal,
          system: `
            You are a helpful assistant for Elastic Observability. You are an expert
            in determining what visualizations are useful for a monitored service.
            
            Based on analysis of the data, you are able to provide suggestions
            on what to visualize, and how to visualize it in Kibana. You will
            use ES|QL, the new Elasticsearch query language, to extract, transform
            and visualize data in the user's environment.
            
          `,
          input: `
          
          First, explain what you want to achieve with the dashboard. Reason from
          the perspective of a team member managing this service. Start with the
          information that is most critical to them to assess how the system is
          performing, and then as you go lower down the dashboard, dive into more
          detailed /broken down information to help identify issues. E.g., consider
          visualizations that are grouped by outcome, or infrastructure, or other
          labels, to identify outliers.

          For each visualization, mention:

          - a title
          - a description
          - the type (line chart, bar chart, metric, area chart, pie chart, heat map, etc)
          - the field that is used and the aggregation type (e.g. sum, count, avg, p95, etc)
          - the datasets that are being used
          - optionally, a filter for the visualization
          - optionally, grouping field or fields for the visualization
    
          ## Service

          The service is called \`${name}\`.

          ### Description

          ${description || 'N/A'}

          ## Sources

          The following sources are being used:

          \`\`\`json
          ${JSON.stringify(sources)}
          \`\`\`

          ## Data analysis

          These are the results of sampled documents, fields that are available,
          and common values in the fields.

          \`\`\`
          ${JSON.stringify(analysisForLlm)}
          \`\`\`
          `,
        })
        .pipe(
          onlyTaskCompleteEvents(),
          switchMap((taskCompleteEvent) => {
            return inference.complete({
              connectorId,
              signal,
              persist: false,
              disableFunctions: {
                except: ['query'],
              },
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    content: `
                    
                      Generate a set of visualizations that can be displayed for the currently
                      viewed service (\`${name}\`).

                      ## Sources:

                      ${JSON.stringify(sources)}

                      Return these visualizations using the "create_visualizations" function.

                      ALL queries where applicable will be visualized over time, over the last
                      24 hours.

                      ## Service description

                      ${description || 'N/A'}

                      # Instructions

                      ${taskCompleteEvent.content}

                    `,
                    role: MessageRole.User,
                  },
                },
              ],
              getScreenContexts: () => {
                return [
                  {
                    actions: [
                      createScreenContextAction(
                        {
                          name: 'create_visualizations',
                          description:
                            'Create visualizations for the currently viewed service to be added to the dashboard',
                          parameters: {
                            type: 'object',
                            properties: {
                              visualizations: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    title: {
                                      type: 'string',
                                    },
                                    description: {
                                      type: 'string',
                                    },
                                    esqlQuery: {
                                      type: 'string',
                                    },
                                  },
                                  required: ['title', 'description', 'esqlQuery'],
                                },
                              },
                            },
                            required: ['visualizations'],
                          },
                        },
                        async () => {
                          return {
                            content: {
                              message: 'Viualizations created, thank you!',
                            },
                          };
                        }
                      ),
                    ],
                  },
                ];
              },
            });
          }),
          filter(
            (event): event is MessageAddEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd
          ),
          toArray(),
          map((messages): InferenceTaskCompleteEvent<Pick<ExtractedService, 'visualizations'>> => {
            const allVisualizations = messages.flatMap((message) => {
              if (message.message.message.function_call?.name === 'create_visualizations') {
                return JSON.parse(message.message.message.function_call.arguments!)
                  .visualizations as Array<{
                  title: string;
                  description: string;
                  esqlQuery: string;
                }>;
              }
              return [];
            });

            return {
              content: '',
              id: 'generated_visualizations',
              output: {
                visualizations: allVisualizations.map((vis) => {
                  return {
                    title: vis.title,
                    description: vis.description,
                    esql: correctCommonEsqlMistakes(vis.esqlQuery).output,
                  };
                }),
              },
              type: InferenceTaskEventType.Complete,
            };
          })
        );
    })
  );
}
