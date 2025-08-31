/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client, TransportResult, TransportRequestOptions } from '@elastic/elasticsearch';
import type { PublicKeys } from '@kbn/utility-types';
import type { ElasticsearchClient, ICustomClusterClient } from '@kbn/core-elasticsearch-server';
import { PRODUCT_RESPONSE_HEADER } from '@kbn/core-elasticsearch-client-server-internal';

const omittedProps = [
  'diagnostic',
  'name',
  'connectionPool',
  'transport',
  'serializer',
  'helpers',
  'acceptedParams',
] as Array<PublicKeys<Client>>;
// Use a Set for faster lookups during descriptor filtering
const omittedPropsSet: Set<string> = new Set(omittedProps as string[]);

export type DeeplyMockedApi<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? ClientApiMockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedApi<T[P]>;
} & T;

// Options for configuring the client mocks
export interface ElasticsearchClientMockOptions {
  /**
   * When true (default), use a lazy Proxy-based mock that creates jest.fn methods on first access
   * and avoids instantiating a real client per mock. When false, use the legacy eager deep-mock
   * behavior that constructs a real Client instance and walks its prototype.
   */
  lazy?: boolean;
}

export interface ClientApiMockInstance<T, Y extends any[]> extends jest.MockInstance<T, Y> {
  /**
   * Helper API around `mockReturnValue` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponse(value: Awaited<T>, opts?: Partial<Omit<TransportResult<T>, 'body'>>): this;

  /**
   * Helper API around `mockReturnValueOnce` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseOnce(value: Awaited<T>, opts?: Partial<Omit<TransportResult<T>, 'body'>>): this;

  /**
   * Helper API around `mockImplementation` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseImplementation(handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>): this;

  /**
   * Helper API around `mockImplementationOnce` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseImplementationOnce(
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ): this;
}

const createMockedApi = <
  T = unknown,
  Y extends [any, TransportRequestOptions] = [any, TransportRequestOptions]
>(): ClientApiMockInstance<T, Y> => {
  const mock: ClientApiMockInstance<T, Y> = jest.fn() as any;

  mock.mockResponse = (value: T, opts?: Partial<Omit<TransportResult<T>, 'body'>>) => {
    mock.mockImplementation((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      if (meta) {
        return Promise.resolve(createApiResponse({ ...opts, body: value })) as any;
      } else {
        return Promise.resolve(value) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseOnce = (value: T, opts?: Partial<Omit<TransportResult<T>, 'body'>>) => {
    mock.mockImplementationOnce((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      if (meta) {
        return Promise.resolve(createApiResponse({ ...opts, body: value })) as any;
      } else {
        return Promise.resolve(value) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseImplementation = (
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ) => {
    mock.mockImplementation((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      // @ts-expect-error couldn't do better while keeping compatibility this jest.MockInstance
      const response = handler(args, options);
      if (meta) {
        return Promise.resolve(createApiResponse(response)) as any;
      } else {
        return Promise.resolve(response.body ?? {}) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseImplementationOnce = (
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ) => {
    mock.mockImplementationOnce((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      // @ts-expect-error couldn't do better while keeping compatibility this jest.MockInstance
      const response = handler(args, options);
      if (meta) {
        return Promise.resolve(createApiResponse(response)) as any;
      } else {
        return Promise.resolve(response.body ?? {}) as Promise<T>;
      }
    });
    return mock;
  };

  return mock;
};

// use jest.requireActual() to prevent weird errors when people mock @elastic/elasticsearch
const { Client: UnmockedClient } = jest.requireActual('@elastic/elasticsearch');

// Create one real client for introspection only (no sockets opened until used),
// reused across lazy proxies to derive the shape without per-instance cost.
const introspectionClient: Client = new UnmockedClient({
  node: 'http://127.0.0.1',
});

const createInternalClientMock = (
  res?: Promise<unknown>,
  options?: ElasticsearchClientMockOptions
): DeeplyMockedApi<Client> => {
  const lazy = options?.lazy ?? true;
  if (lazy) {
    return createLazyClientMock(res, options);
  }
  // Legacy non-lazy behavior below
  // we mimic 'reflection' on a concrete instance of the client to generate the mocked functions.
  const client = new UnmockedClient({
    node: 'http://127.0.0.1',
  });

  // Reuse a single default implementation per client instance to reduce
  // per-method closure allocations. This preserves behavior while lowering CPU/GC.
  const defaultMethodImpl = () => res ?? createSuccessTransportRequestPromise({});

  const getAllPropertyDescriptors = (obj: Record<string, any>) => {
    const descriptors = Object.entries(Object.getOwnPropertyDescriptors(obj));
    let prototype = Object.getPrototypeOf(obj);
    // Track seen property names to avoid duplicate processing from prototypes
    const seen = new Set<string>(descriptors.map(([k]) => k));
    while (prototype != null && prototype !== Object.prototype) {
      const protoDescriptors = Object.entries(Object.getOwnPropertyDescriptors(prototype));
      for (const [key, desc] of protoDescriptors) {
        if (!seen.has(key)) {
          seen.add(key);
          descriptors.push([key, desc]);
        }
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    return descriptors;
  };

  const mockify = (obj: Record<string, any>, omitted: string[] = []) => {
    // the @elastic/elasticsearch::Client uses prototypical inheritance
    // so we have to crawl up the prototype chain and get all descriptors
    // to find everything that we should be mocking
    // Prevent infinite recursion or re-visiting the same nested objects
    const visited = new WeakSet<object>();
    const processObject = (target: Record<string, any>) => {
      if (visited.has(target)) return;
      visited.add(target);
      for (const [key, descriptor] of getAllPropertyDescriptors(target)) {
        if (omittedPropsSet.has(key) || omitted.includes(key)) continue;
        if (typeof descriptor.value === 'function') {
          const mock = createMockedApi();
          mock.mockImplementation(defaultMethodImpl as any);
          target[key] = mock;
        } else if (typeof target[key] === 'object' && target[key] != null) {
          processObject(target[key]);
        }
      }
    };
    processObject(obj);
  };

  mockify(client, omittedProps as string[]);

  client.close = jest.fn().mockReturnValue(Promise.resolve());
  client.child = jest.fn().mockImplementation(() => createInternalClientMock());

  const mockGetter = (obj: Record<string, any>, propertyName: string) => {
    // Memoize the returned mock so repeated accesses don't allocate new fns
    const fn = jest.fn();
    Object.defineProperty(obj, propertyName, {
      configurable: true,
      enumerable: false,
      get: () => fn,
      set: undefined,
    });
  };

  // `on`, `off`, and `once` are properties without a setter.
  // We can't `client.diagnostic.on = jest.fn()` because the following error will be thrown:
  // TypeError: Cannot set property on of #<Client> which has only a getter
  mockGetter(client.diagnostic, 'on');
  mockGetter(client.diagnostic, 'off');
  mockGetter(client.diagnostic, 'once');
  client.transport = {
    request: jest.fn(),
  };

  return client as DeeplyMockedApi<Client>;
};

// Build a lazy Proxy-based mock using the shared introspection client
function createLazyClientMock(
  res?: Promise<unknown>,
  options?: ElasticsearchClientMockOptions
): DeeplyMockedApi<Client> {
  // per-instance default implementation to avoid per-method closures
  const defaultMethodImpl = () => res ?? createSuccessTransportRequestPromise({});

  const proxiesCache = new WeakMap<object, any>();

  const createDiagnosticStub = () => {
    const on = jest.fn();
    const off = jest.fn();
    const once = jest.fn();
    return Object.create(null, {
      on: { configurable: true, enumerable: false, get: () => on },
      off: { configurable: true, enumerable: false, get: () => off },
      once: { configurable: true, enumerable: false, get: () => once },
    });
  };

  const getOmittedStub = (prop: string) => {
    switch (prop) {
      case 'diagnostic':
        return createDiagnosticStub();
      case 'transport':
        return { request: jest.fn() };
      default:
        return undefined;
    }
  };

  const makeMethodMock = () => {
    const mock = createMockedApi();
    mock.mockImplementation(defaultMethodImpl as any);
    return mock;
  };

  const createProxy = (shape: Record<string, any>, isRoot: boolean): any => {
    if (shape && typeof shape === 'object') {
      const cached = proxiesCache.get(shape);
      if (cached) return cached;

      const store: Record<string, any> = {};
      const proxy = new Proxy(store, {
        get(target, prop, receiver) {
          if (prop === 'then') return undefined; // avoid thenable
          if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);

          // string-only handling for known API keys
          if (typeof prop === 'string') {
            if (omittedPropsSet.has(prop)) {
              const value = getOmittedStub(prop);
              target[prop] = value;
              return value;
            }

            // Special-cases for lifecycle methods
            if (prop === 'close') {
              const fn = jest.fn().mockResolvedValue(undefined);
              target[prop] = fn;
              return fn;
            }
            if (prop === 'child') {
              const fn = jest.fn().mockImplementation(() => createInternalClientMock(res, options));
              target[prop] = fn;
              return fn;
            }

            const valueFromShape = Reflect.get(shape, prop);
            if (typeof valueFromShape === 'function') {
              const fn = makeMethodMock();
              target[prop] = fn;
              return fn;
            }
            if (valueFromShape && typeof valueFromShape === 'object') {
              const child = createProxy(valueFromShape, false);
              target[prop] = child;
              return child;
            }
            // primitive or undefined: copy as-is
            target[prop] = valueFromShape;
            return valueFromShape;
          }
          return undefined;
        },
        set(target, prop, value) {
          target[prop as any] = value;
          return true;
        },
      });

      proxiesCache.set(shape, proxy);
      return proxy;
    }
    return {};
  };

  // Root proxy based on the shared introspection client
  return createProxy(
    introspectionClient as unknown as Record<string, any>,
    true
  ) as DeeplyMockedApi<Client>;
}

export type ElasticsearchClientMock = DeeplyMockedApi<ElasticsearchClient>;

const createClientMock = (
  res?: Promise<unknown>,
  options?: ElasticsearchClientMockOptions
): ElasticsearchClientMock =>
  createInternalClientMock(res, options) as unknown as ElasticsearchClientMock;

export interface ScopedClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asCurrentUser: ElasticsearchClientMock;
  asSecondaryAuthUser: ElasticsearchClientMock;
}

const createScopedClusterClientMock = (options?: ElasticsearchClientMockOptions) => {
  const mock: ScopedClusterClientMock = {
    asInternalUser: createClientMock(undefined, options),
    asCurrentUser: createClientMock(undefined, options),
    asSecondaryAuthUser: createClientMock(undefined, options),
  };

  return mock;
};

export interface ClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asScoped: jest.MockedFunction<() => ScopedClusterClientMock>;
}

const createClusterClientMock = (options?: ElasticsearchClientMockOptions) => {
  const mock: ClusterClientMock = {
    asInternalUser: createClientMock(undefined, options),
    asScoped: jest.fn(),
  };

  mock.asScoped.mockReturnValue(createScopedClusterClientMock(options));

  return mock;
};

export type CustomClusterClientMock = jest.Mocked<ICustomClusterClient> & ClusterClientMock;

const createCustomClusterClientMock = (options?: ElasticsearchClientMockOptions) => {
  const mock: CustomClusterClientMock = {
    asInternalUser: createClientMock(undefined, options),
    asScoped: jest.fn(),
    close: jest.fn(),
  };

  mock.asScoped.mockReturnValue(createScopedClusterClientMock(options));
  mock.close.mockReturnValue(Promise.resolve());

  return mock;
};

const createSuccessTransportRequestPromise = <T>(
  body: T,
  { statusCode = 200 }: { statusCode?: number } = {},
  headers: Record<string, string | string[]> = { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' }
): Promise<TransportResult<T> & T> => {
  const response = createApiResponse({ body, statusCode, headers });
  return Promise.resolve(response) as Promise<TransportResult<T> & T>;
};

const createErrorTransportRequestPromise = (err: any): Promise<never> => {
  return Promise.reject(err);
};

function createApiResponse<TResponse = Record<string, any>>(
  opts: Partial<TransportResult<TResponse>> = {}
): TransportResult<TResponse> {
  return {
    body: {} as any,
    statusCode: 200,
    headers: { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' },
    warnings: [],
    meta: {} as any,
    ...opts,
  };
}

export const elasticsearchClientMock = {
  createClusterClient: createClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createScopedClusterClient: createScopedClusterClientMock,
  createElasticsearchClient: createClientMock,
  createInternalClient: createInternalClientMock,
  createSuccessTransportRequestPromise,
  createErrorTransportRequestPromise,
  createApiResponse,
};
