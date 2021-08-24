/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { I18nProvider } from '@kbn/i18n/react';
import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { MockedMounterTuple, Mountable } from '../test_types';
import type { AppMountParameters } from '../types';

type Dom = ReturnType<typeof mount> | null;
type Renderer = () => Dom | Promise<Dom>;

export const createRenderer = (element: ReactElement | null): Renderer => {
  const dom: Dom = element && mount(<I18nProvider>{element}</I18nProvider>);

  return () =>
    new Promise(async (resolve) => {
      if (dom) {
        await act(async () => {
          dom.update();
        });
      }
      setImmediate(() => resolve(dom)); // flushes any pending promises
    });
};

export const createAppMounter = ({
  appId,
  html = `<div>App ${appId}</div>`,
  appRoute = `/app/${appId}`,
  deepLinkPaths = {},
  exactRoute = false,
  extraMountHook,
}: {
  appId: string;
  html?: string;
  appRoute?: string;
  deepLinkPaths?: Record<string, string>;
  exactRoute?: boolean;
  extraMountHook?: (params: AppMountParameters) => void;
}): MockedMounterTuple => {
  const unmount = jest.fn();
  return [
    appId,
    {
      mounter: {
        appRoute,
        appBasePath: appRoute,
        deepLinkPaths,
        exactRoute,
        mount: jest.fn(async (params: AppMountParameters) => {
          const { appBasePath: basename, element } = params;
          Object.assign(element, {
            innerHTML: `<div>\nbasename: ${basename}\nhtml: ${html}\n</div>`,
          });
          unmount.mockImplementation(() => Object.assign(element, { innerHTML: '' }));
          if (extraMountHook) {
            extraMountHook(params);
          }
          return unmount;
        }),
      },
      unmount,
    },
  ];
};

export function getUnmounter(app: Mountable) {
  return app.mounter.mount.mock.results[0].value;
}
