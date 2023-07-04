/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponse, type HttpSetup } from '@kbn/core/public';
import { omit } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { CoPilotConversation, CoPilotConversationMessage } from '../../../common/co_pilot';
import { createStreamingChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';
import { type CoPilotService } from '../../typings/co_pilot';

function httpResponseIntoObservable(responsePromise: Promise<HttpResponse>) {
  const subject = new BehaviorSubject<string>('');
  responsePromise
    .then((response) => {
      const status = response.response?.status;

      if (!status || status >= 400) {
        throw new Error(response.response?.statusText || 'Unexpected error');
      }

      const reader = response.response.body?.getReader();

      if (!reader) {
        throw new Error('Could not get reader from response');
      }

      const decoder = new TextDecoder();

      function read() {
        reader!.read().then(({ done, value }) => {
          try {
            if (done) {
              subject.complete();
              return;
            }

            subject.next(decoder.decode(value));
          } catch (err) {
            subject.error(err);
            return;
          }
          read();
        });
      }

      read();
    })
    .catch((err) => {
      subject.error(err);
    });
  return createStreamingChatResponseObservable(subject);
}

export function createCoPilotService({ enabled, http }: { enabled: boolean; http: HttpSetup }) {
  const service: CoPilotService = {
    isEnabled() {
      return enabled;
    },
    prompt(promptId, params) {
      return httpResponseIntoObservable(
        http.post(`/internal/observability/copilot/prompts/${promptId}`, {
          body: JSON.stringify(params),
          asResponse: true,
          rawResponse: true,
        })
      );
    },
    async createConversation() {
      return (await http.post(`/internal/observability/copilot/conversation/create`, {})) as {
        conversation: CoPilotConversation;
      };
    },
    async listConversations(size: number) {
      return (await http.get(`/internal/observability/copilot/conversation`, {
        query: {
          size,
        },
      })) as {
        conversations: CoPilotConversation[];
      };
    },
    async loadConversation(conversationId: string) {
      return (await http.get(
        `/internal/observability/copilot/conversation/${conversationId}`,
        {}
      )) as {
        conversation: CoPilotConversation;
        messages: CoPilotConversationMessage[];
      };
    },
    async autoTitleConversation(conversationId: string) {
      return (await http.post(
        `/internal/observability/copilot/conversation/${conversationId}/auto_title`,
        {}
      )) as {
        conversation: CoPilotConversation;
      };
    },
    chat(messages) {
      return httpResponseIntoObservable(
        http.post(`/internal/observability/copilot/chat`, {
          body: JSON.stringify({
            messages,
          }),
          asResponse: true,
          rawResponse: true,
        })
      );
    },
    async append(conversationId, messages) {
      return (await http.post(
        `/internal/observability/copilot/conversation/${conversationId}/append`,
        { body: JSON.stringify({ messages }) }
      )) as {
        messages: CoPilotConversationMessage[];
      };
    },
    async callFunction(message) {
      switch (message.function_call?.name) {
        default:
          throw new Error(`No or unknown function call defined`);

        case 'get_apm_chart':
          return {
            ...omit(
              await http.post(`/internal/apm/assistant/${message.function_call!.name!}`, {
                body: JSON.stringify({
                  now: Date.now(),
                  args: JSON.parse(message.function_call!.arguments!),
                }),
                query: {
                  _inspect: 'true',
                },
              }),
              '_inspect'
            ),
            role: 'function',
            name: message.function_call.name,
          };
          break;
      }
    },
  };

  return service;
}
