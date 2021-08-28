/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InventoryMetrics } from '../../types';
import { sqsMessagesDelayed } from './snapshot/sqs_messages_delayed';
import { sqsMessagesEmpty } from './snapshot/sqs_messages_empty';
import { sqsMessagesSent } from './snapshot/sqs_messages_sent';
import { sqsMessagesVisible } from './snapshot/sqs_messages_visible';
import { sqsOldestMessage } from './snapshot/sqs_oldest_message';
import { awsSQSMessagesDelayed } from './tsvb/aws_sqs_messages_delayed';
import { awsSQSMessagesEmpty } from './tsvb/aws_sqs_messages_empty';
import { awsSQSMessagesSent } from './tsvb/aws_sqs_messages_sent';
import { awsSQSMessagesVisible } from './tsvb/aws_sqs_messages_visible';
import { awsSQSOldestMessage } from './tsvb/aws_sqs_oldest_message';

export const metrics: InventoryMetrics = {
  tsvb: {
    awsSQSMessagesVisible,
    awsSQSMessagesDelayed,
    awsSQSMessagesSent,
    awsSQSMessagesEmpty,
    awsSQSOldestMessage,
  },
  snapshot: {
    sqsMessagesVisible,
    sqsMessagesDelayed,
    sqsMessagesEmpty,
    sqsMessagesSent,
    sqsOldestMessage,
  },
  defaultSnapshot: 'sqsMessagesVisible',
  defaultTimeRangeInSeconds: 14400, // 4 hours
};
