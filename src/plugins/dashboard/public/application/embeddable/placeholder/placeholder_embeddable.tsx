/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import type { EmbeddableInput } from '../../../../../embeddable/common/types';
import type { IContainer } from '../../../../../embeddable/public/lib/containers/i_container';
import { Embeddable } from '../../../../../embeddable/public/lib/embeddables/embeddable';

export const PLACEHOLDER_EMBEDDABLE = 'placeholder';

export class PlaceholderEmbeddable extends Embeddable {
  public readonly type = PLACEHOLDER_EMBEDDABLE;
  private node?: HTMLElement;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
    this.input = initialInput;
  }
  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const classes = classNames('embPanel', 'embPanel-isLoading');
    ReactDOM.render(
      <div className={classes}>
        <EuiLoadingChart size="l" mono />
      </div>,
      node
    );
  }

  public reload() {}
}
