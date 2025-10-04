/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { compact } from 'lodash';
import { format, parse } from 'node:url';
import Path from 'path';
import type { UrlWithParsedQuery } from 'url';
import { FetchResponseError } from './kibana_fetch_response_error';
import { createProxyTransport } from './proxy_transport';
import { getInternalKibanaHeaders } from './get_internal_kibana_headers';

type FetchInputOptions = string | URL;
type FetchInitOptions = Omit<globalThis.RequestInit, 'body'> & { body: unknown };

interface KibanaClientOptions {
  baseUrl: string;
  spaceId?: string;
  signal: AbortSignal;
  auth?: ClientOptions['auth'];
  headers?: Record<string, string | string[]>;
}

function combineSignal(left: AbortSignal, right?: AbortSignal | null | undefined) {
  if (!right) {
    return left;
  }
  const controller = new AbortController();

  left.addEventListener('abort', () => {
    controller.abort();
  });

  right?.addEventListener('abort', () => {
    controller.abort();
  });

  return controller.signal;
}

export class KibanaClient {
  public readonly es: Client;

  private readonly inputOptions: URL;
  private readonly initOptions: Partial<FetchInitOptions>;
  constructor(private readonly options: KibanaClientOptions) {
    const parsedBaseUrl = parse(options.baseUrl, true);

    const node = format({
      ...parsedBaseUrl,
      auth: null,
      pathname: null,
    });

    const [username, password] = parsedBaseUrl.auth?.split(';') ?? ['', ''];

    const auth = options.auth
      ? options.auth
      : username && password
      ? { username, password }
      : undefined;

    this.inputOptions = new URL(options.baseUrl);

    this.inputOptions.username = '';
    this.inputOptions.password = '';

    const Authorization = auth
      ? 'apiKey' in auth
        ? `ApiKey ${auth.apiKey}`
        : 'username' in auth && 'password' in auth
        ? `Basic ${Buffer.from([auth.username, auth.password].join(':')).toString('base64')}`
        : undefined
      : undefined;

    this.initOptions = {
      headers: {
        ...getInternalKibanaHeaders(),
        ...options.headers,
        ...(Authorization ? { Authorization } : {}),
      },
    };

    this.es = new Client({
      auth: options.auth,
      node,
      Transport: createProxyTransport({
        pathname: parsedBaseUrl.pathname!,
        headers: this.initOptions.headers,
      }),
    });
  }

  fetch(
    options: FetchInputOptions,
    init: FetchInitOptions & { asRawResponse: true }
  ): Promise<Response>;

  fetch<T>(options: FetchInputOptions, init?: FetchInitOptions): Promise<T>;

  async fetch<T>(
    options: FetchInputOptions,
    init?: FetchInitOptions & { asRawResponse?: boolean }
  ): Promise<T | Response> {
    const urlObject =
      typeof options === 'string'
        ? {
            pathname: options,
          }
        : options;

    const urlOptions: UrlWithParsedQuery = {
      ...parse(this.inputOptions.toString(), true),
      ...urlObject,
      pathname: Path.posix.join(
        ...compact([
          '/',
          this.inputOptions.pathname,
          ...(this.options.spaceId ? ['s', this.options.spaceId] : []),
          urlObject.pathname,
        ])
      ),
      auth: null,
    };

    const body = init?.body ? JSON.stringify(init?.body) : undefined;

    const response = await fetch(format(urlOptions), {
      ...this.initOptions,
      ...init,
      headers: {
        ['content-type']: 'application/json',
        ...this.initOptions.headers,
        ...init?.headers,
      },
      signal: combineSignal(this.options.signal, init?.signal),
      body,
    });

    if (init?.asRawResponse) {
      return response;
    }

    if (response.status >= 400) {
      const content = response.headers.get('content-type')?.includes('application/json')
        ? await response
            .json()
            .then((jsonResponse) => {
              if ('message' in jsonResponse) {
                return jsonResponse.message;
              }
              return JSON.stringify(jsonResponse);
            })
            .catch(() => {})
        : await response.text().catch(() => {});

      throw new FetchResponseError(response, content ?? response.statusText);
    }

    return response.json() as Promise<T>;
  }
}
