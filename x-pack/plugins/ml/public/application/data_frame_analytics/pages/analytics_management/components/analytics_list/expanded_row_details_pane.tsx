/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FC, ReactElement } from 'react';
import React, { Fragment } from 'react';
import './expanded_row_details_pane.scss';

export interface SectionItem {
  title: string;
  description: string | ReactElement;
}
export interface SectionConfig {
  title: string;
  position: 'left' | 'right';
  items: SectionItem[];
  dataTestSubj: string;
}

interface SectionProps {
  section: SectionConfig;
}

export const Section: FC<SectionProps> = ({ section }) => {
  if (section.items.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'title',
      name: '',
      render: (v: SectionItem['title']) => <strong>{v}</strong>,
    },
    {
      field: 'description',
      name: '',
      render: (v: SectionItem['description']) => <>{v}</>,
    },
  ];

  return (
    <div data-test-subj={section.dataTestSubj}>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiBasicTable<SectionItem>
        compressed
        items={section.items}
        columns={columns}
        tableCaption={section.title}
        tableLayout="auto"
        className="mlExpandedRowDetailsSection"
        data-test-subj={`${section.dataTestSubj}-table`}
      />
    </div>
  );
};

interface ExpandedRowDetailsPaneProps {
  sections: SectionConfig[];
  dataTestSubj: string;
}

export const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps> = ({
  sections,
  dataTestSubj,
}) => {
  return (
    <EuiFlexGroup className="mlExpandedRowDetails" data-test-subj={dataTestSubj}>
      <EuiFlexItem style={{ width: '50%' }}>
        {sections
          .filter((s) => s.position === 'left')
          .map((s) => (
            <Fragment key={s.title}>
              <EuiSpacer size="s" />
              <Section section={s} />
            </Fragment>
          ))}
      </EuiFlexItem>
      <EuiFlexItem style={{ width: '50%' }}>
        {sections
          .filter((s) => s.position === 'right')
          .map((s) => (
            <Fragment key={s.title}>
              <EuiSpacer size="s" />
              <Section section={s} />
            </Fragment>
          ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
