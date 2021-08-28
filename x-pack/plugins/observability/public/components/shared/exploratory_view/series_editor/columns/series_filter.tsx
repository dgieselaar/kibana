/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useState } from 'react';
import { FieldLabels } from '../../configurations/constants/constants';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import type { SeriesConfig } from '../../types';
import { SelectedFilters } from '../selected_filters';
import { FilterExpanded } from './filter_expanded';

interface Props {
  seriesId: string;
  filterFields: SeriesConfig['filterFields'];
  baseFilters: SeriesConfig['baseFilters'];
  seriesConfig: SeriesConfig;
  isNew?: boolean;
  labels?: Record<string, string>;
}

export interface Field {
  label: string;
  field: string;
  nested?: string;
  isNegated?: boolean;
}

export function SeriesFilter({
  seriesConfig,
  isNew,
  seriesId,
  filterFields = [],
  baseFilters,
  labels,
}: Props) {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  const [selectedField, setSelectedField] = useState<Field | undefined>();

  const options: Field[] = filterFields.map((field) => {
    if (typeof field === 'string') {
      return { label: labels?.[field] ?? FieldLabels[field], field };
    }

    return {
      field: field.field,
      nested: field.nested,
      isNegated: field.isNegated,
      label: labels?.[field.field] ?? FieldLabels[field.field],
    };
  });

  const { setSeries, getSeries } = useSeriesStorage();
  const urlSeries = getSeries(seriesId);

  const button = (
    <EuiButtonEmpty
      flush="left"
      iconType="plus"
      onClick={() => {
        setIsPopoverVisible((prevState) => !prevState);
      }}
      size="s"
    >
      {i18n.translate('xpack.observability.expView.seriesEditor.addFilter', {
        defaultMessage: 'Add filter',
      })}
    </EuiButtonEmpty>
  );

  const mainPanel = (
    <>
      <EuiSpacer size="s" />
      {options.map((opt) => (
        <Fragment key={opt.label}>
          <EuiButton
            fullWidth={true}
            iconType="arrowRight"
            iconSide="right"
            onClick={() => {
              setSelectedField(opt);
            }}
          >
            {opt.label}
          </EuiButton>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  );

  const childPanel = selectedField ? (
    <FilterExpanded
      seriesId={seriesId}
      field={selectedField.field}
      label={selectedField.label}
      nestedField={selectedField.nested}
      isNegated={selectedField.isNegated}
      goBack={() => {
        setSelectedField(undefined);
      }}
      filters={baseFilters}
    />
  ) : null;

  const closePopover = () => {
    setIsPopoverVisible(false);
    setSelectedField(undefined);
  };

  return (
    <EuiFlexGroup wrap direction="column" gutterSize="xs" alignItems="flexStart">
      <SelectedFilters seriesId={seriesId} seriesConfig={seriesConfig} isNew={isNew} />
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverVisible}
          closePopover={closePopover}
          anchorPosition={isNew ? 'leftCenter' : 'rightCenter'}
        >
          {!selectedField ? mainPanel : childPanel}
        </EuiPopover>
      </EuiFlexItem>
      {(urlSeries.filters ?? []).length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            color="text"
            iconType="cross"
            onClick={() => {
              setSeries(seriesId, { ...urlSeries, filters: undefined });
            }}
            size="s"
          >
            {i18n.translate('xpack.observability.expView.seriesEditor.clearFilter', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
