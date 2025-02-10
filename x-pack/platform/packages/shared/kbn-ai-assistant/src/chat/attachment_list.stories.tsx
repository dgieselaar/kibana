/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ComponentStory, ComponentStoryObj } from '@storybook/react';
import { css } from '@emotion/react';
import { Attachment } from '@kbn/observability-ai-assistant-plugin/common';
import { v4 } from 'uuid';
import { SnapshotImage } from '@kbn/observability-ai-assistant-plugin/common/types';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import {
  AttachmentList as Component,
  AttachmentListProps as ComponentProps,
} from './attachment_list';

/*
  JSON Schema validation in the PromptEditor compponent does not work
  when rendering the component from within Storybook.

*/
export default {
  component: Component,
  title: 'app/AttachmentList',
  argTypes: {},
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  decorators: [KibanaReactStorybookDecorator],
};

function getImage() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  canvas.width = 800;
  canvas.height = 800;

  const ctx = canvas.getContext('2d')!;

  // Fill the background with a color
  ctx.fillStyle = '#FF0000'; // red
  ctx.fillRect(0, 0, 800, 800);

  // Add a smaller blue square
  ctx.fillStyle = '#0000FF'; // blue
  ctx.fillRect(25, 25, 50, 50);

  const result: SnapshotImage = {
    encoding: 'base64',
    dataURL: canvas.toDataURL(),
  };

  document.body.removeChild(canvas);

  return result;
}

const Template: ComponentStory<typeof Component> = (props: ComponentProps) => {
  const image = useMemo(() => {
    return getImage();
  }, []);

  const attachments = useMemo<Attachment[]>(
    () => [
      {
        '@timestamp': new Date().toISOString(),
        id: v4(),
        payload: {
          note: {
            message: `Here's a short note`,
          },
        },
        type: 'note',
      } as Attachment,
      {
        '@timestamp': new Date().toISOString(),
        id: v4(),
        payload: {
          snapshot: {
            title: 'Example.com',
            // use a script URL to simulate an in-page link
            // eslint-disable-next-line no-script-url
            href: 'javascript:void()',
            image,
          },
        },
        type: 'snapshot',
      } as Attachment,
    ],
    [image]
  );

  return (
    <Component
      css={css`
        width: 480px;
      `}
      {...props}
      attachments={attachments}
      onAttachmentRemove={async (nextAttachments) => {}}
    />
  );
};

export const InputControlModePrompt: ComponentStoryObj<typeof Component> = {
  args: {},
  render: Template,
};
