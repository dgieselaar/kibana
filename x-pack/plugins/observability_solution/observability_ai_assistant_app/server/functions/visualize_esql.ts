/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { truncateList } from '@kbn/observability-ai-assistant-plugin/common';
import {
  visualizeESQLFunction,
  type VisualizeQueryResponsev2,
} from '../../common/functions/visualize_esql';
import type { FunctionRegistrationParameters } from '.';
import { runAndValidateEsqlQuery } from './query/validate_esql_query';
import { queryResultToKeyValue } from './query/query_result_to_key_value';

export function registerVisualizeESQLFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    visualizeESQLFunction,
    async ({
      arguments: { query, intention = VisualizeESQLUserIntention.visualizeAuto },
    }): Promise<VisualizeQueryResponsev2> => {
      // errorMessages contains the syntax errors from the client side valdation
      // error contains the error from the server side validation, it is always one error
      // and help us identify errors like index not found, field not found etc.
      const { columns, errorMessages, rows, error } = await runAndValidateEsqlQuery({
        query,
        client: (await resources.context.core).elasticsearch.client.asCurrentUser,
      });

      let results: Array<Record<string, unknown> | string> = [];
      let instructions: string | undefined = 'The query yielded no results.';

      if (columns && rows) {
        results = truncateList(
          queryResultToKeyValue({ columns, rows }),
          columns.length > 10 ? 10 : 50
        );
        instructions = `The messages are already displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES repeat the results back to the user. Only mention the interesting things and analyze them.`;
      }

      return {
        data: {
          columns: columns ?? [],
          rows: rows ?? [],
        },
        content: {
          instructions,
          errorMessages: [
            ...(errorMessages ? errorMessages : []),
            ...(error ? [error.message] : []),
          ],
          results,
          totalRows: rows?.length,
        },
      };
    }
  );
}
