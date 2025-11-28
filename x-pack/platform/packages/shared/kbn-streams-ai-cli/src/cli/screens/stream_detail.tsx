/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// StreamDetail encapsulates all stream-specific navigation and workflow logic.
// App-level logic now only mounts/unmounts this component and supplies shared context.

import type { StreamWorkflow } from '@kbn/streams-ai';
import {
  generateDescriptionWorkflow,
  generateNaturalLanguageQueriesWorkflow,
  onboardAnomalyDetectionJobsWorkflow,
  onboardDashboardsWorkflow,
  onboardFieldDefinitionsWorkflow,
  onboardProcessingWorkflow,
  onboardRulesWorkflow,
  onboardSLOsWorkflow,
  onboardStreamWorkflow,
  partitionStreamWorkflow,
} from '@kbn/streams-ai';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import {
  RouteMenu,
  type RouteMenuDisplayItemProps,
  type RouteMenuItemProps,
} from '@kbn/ink/router';
import { ChatWithData } from './chat_with_data';
import { DescribeDataset } from './describe_dataset';
import { WorkflowDetail } from './workflow_detail';

export interface StreamDetailProps {
  stream: Streams.all.Definition;
}

export function StreamDetail({ stream }: StreamDetailProps) {
  const workflows: Record<string, { workflow: StreamWorkflow; label: string }> = useMemo(() => {
    return {
      'full-flow': {
        label: 'Full Onboarding Flow',
        workflow: onboardStreamWorkflow,
      },
      'partition-stream': {
        label: 'Partition Stream',
        workflow: partitionStreamWorkflow,
      },
      description: {
        label: 'Description',
        workflow: generateDescriptionWorkflow,
      },
      'anomaly-detection': {
        label: 'Anomaly Detection',
        workflow: onboardAnomalyDetectionJobsWorkflow,
      },
      dashboards: {
        label: 'Dashboards',
        workflow: onboardDashboardsWorkflow,
      },
      'nl-queries': {
        label: 'Natural Language Queries',
        workflow: generateNaturalLanguageQueriesWorkflow,
      },
      processing: {
        label: 'Processing',
        workflow: onboardProcessingWorkflow,
      },
      rules: {
        label: 'Rules',
        workflow: onboardRulesWorkflow,
      },
      slos: {
        label: 'SLOs',
        workflow: onboardSLOsWorkflow,
      },
      'field-definitions': {
        label: 'Field Definitions',
        workflow: onboardFieldDefinitionsWorkflow,
      },
    };
  }, []);

  const items = useMemo((): RouteMenuItemProps[] => {
    const topLevelItems: RouteMenuItemProps[] = [
      {
        label: 'Chat',
        path: `chat`,
        element: <ChatWithData stream={stream} />,
      },
      {
        label: 'Describe dataset',
        path: `describe_dataset`,
        element: <DescribeDataset stream={stream} />,
      },
    ];

    const workflowItems: RouteMenuItemProps[] = Object.entries(workflows).map(
      ([id, { label, workflow }]): RouteMenuDisplayItemProps => {
        return {
          label,
          path: `workflow/${id}`,
          element: <WorkflowDetail stream={stream} label={label} workflow={workflow} />,
        };
      }
    );

    return topLevelItems.concat(workflowItems);
  }, [stream, workflows]);

  return <RouteMenu label="Stream Actions" items={items} />;
}
