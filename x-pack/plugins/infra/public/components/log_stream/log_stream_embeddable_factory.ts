/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from '../../../../../../src/core/public/types';
import type { IContainer } from '../../../../../../src/plugins/embeddable/public/lib/containers/i_container';
import type { EmbeddableFactoryDefinition } from '../../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_factory_definition';
import type { InfraClientStartDeps } from '../../types';
import type { LogStreamEmbeddableInput } from './log_stream_embeddable';
import { LogStreamEmbeddable, LOG_STREAM_EMBEDDABLE } from './log_stream_embeddable';

export class LogStreamEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<LogStreamEmbeddableInput> {
  public readonly type = LOG_STREAM_EMBEDDABLE;

  constructor(private getStartServices: StartServicesAccessor<InfraClientStartDeps>) {}

  public async isEditable() {
    const [{ application }] = await this.getStartServices();
    return application.capabilities.logs.save as boolean;
  }

  public async create(initialInput: LogStreamEmbeddableInput, parent?: IContainer) {
    const [core, plugins] = await this.getStartServices();
    return new LogStreamEmbeddable(core, plugins, initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.infra.logStreamEmbeddable.displayName', {
      defaultMessage: 'Log stream',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.infra.logStreamEmbeddable.description', {
      defaultMessage: 'Add a table of live streaming logs.',
    });
  }

  public getIconType() {
    return 'logsApp';
  }

  public async getExplicitInput() {
    return {
      title: i18n.translate('xpack.infra.logStreamEmbeddable.title', {
        defaultMessage: 'Log stream',
      }),
    };
  }
}
