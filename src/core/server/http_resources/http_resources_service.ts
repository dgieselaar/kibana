/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import type { RequestHandlerContext } from '..';
import type { CoreService } from '../../types/core_service';
import type { CoreContext } from '../core_context';
import { KibanaRequest } from '../http/router/request';
import type { KibanaResponseFactory } from '../http/router/response';
import type { RouteConfig } from '../http/router/route';
import type { IRouter } from '../http/router/router';
import type { InternalHttpServicePreboot, InternalHttpServiceSetup } from '../http/types';
import type {
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
} from '../rendering/types';
import { getApmConfig } from './get_apm_config';
import type {
  HttpResources,
  HttpResourcesRenderOptions,
  HttpResourcesRequestHandler,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
  InternalHttpResourcesSetup,
} from './types';

export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  rendering: InternalRenderingServicePreboot;
}

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  rendering: InternalRenderingServiceSetup;
}

export class HttpResourcesService implements CoreService<InternalHttpResourcesSetup> {
  private readonly logger: Logger;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('http-resources');
  }

  preboot(deps: PrebootDeps) {
    this.logger.debug('prebooting HttpResourcesService');
    return {
      createRegistrar: this.createRegistrar.bind(this, deps),
    };
  }

  setup(deps: SetupDeps) {
    this.logger.debug('setting up HttpResourcesService');
    return {
      createRegistrar: this.createRegistrar.bind(this, deps),
    };
  }

  start() {}

  stop() {}

  private createRegistrar(deps: SetupDeps | PrebootDeps, router: IRouter): HttpResources {
    return {
      register: <P, Q, B, Context extends RequestHandlerContext = RequestHandlerContext>(
        route: RouteConfig<P, Q, B, 'get'>,
        handler: HttpResourcesRequestHandler<P, Q, B, Context>
      ) => {
        return router.get<P, Q, B>(route, (context, request, response) => {
          return handler(context as Context, request, {
            ...response,
            ...this.createResponseToolkit(deps, context, request, response),
          });
        });
      },
    };
  }

  private createResponseToolkit(
    deps: SetupDeps | PrebootDeps,
    context: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ): HttpResourcesServiceToolkit {
    const cspHeader = deps.http.csp.header;
    return {
      async renderCoreApp(options: HttpResourcesRenderOptions = {}) {
        const apmConfig = getApmConfig(request.url.pathname);
        const body = await deps.rendering.render(request, context.core.uiSettings.client, {
          includeUserSettings: true,
          vars: {
            apmConfig,
          },
        });

        return response.ok({
          body,
          headers: { ...options.headers, 'content-security-policy': cspHeader },
        });
      },
      async renderAnonymousCoreApp(options: HttpResourcesRenderOptions = {}) {
        const apmConfig = getApmConfig(request.url.pathname);
        const body = await deps.rendering.render(request, context.core.uiSettings.client, {
          includeUserSettings: false,
          vars: {
            apmConfig,
          },
        });

        return response.ok({
          body,
          headers: { ...options.headers, 'content-security-policy': cspHeader },
        });
      },
      renderHtml(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/html',
            'content-security-policy': cspHeader,
          },
        });
      },
      renderJs(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/javascript',
            'content-security-policy': cspHeader,
          },
        });
      },
    };
  }
}
