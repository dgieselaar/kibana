/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCard, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { ConnectorTypes } from '../../../common/api/connectors';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { getConnectorIcon } from '../utils';

interface ConnectorCardProps {
  connectorType: ConnectorTypes;
  title: string;
  listItems: Array<{ title: string; description: React.ReactNode }>;
  isLoading: boolean;
}

const StyledText = styled.span`
  span {
    display: block;
  }
`;

const ConnectorCardDisplay: React.FC<ConnectorCardProps> = ({
  connectorType,
  title,
  listItems,
  isLoading,
}) => {
  const { triggersActionsUi } = useKibana().services;

  const description = useMemo(
    () => (
      <StyledText>
        {listItems.length > 0 &&
          listItems.map((item, i) => (
            <span data-test-subj="card-list-item" key={`${item.title}-${i}`}>
              <strong>{`${item.title}: `}</strong>
              {item.description}
            </span>
          ))}
      </StyledText>
    ),
    [listItems]
  );

  const icon = useMemo(
    () => <EuiIcon size="xl" type={getConnectorIcon(triggersActionsUi, connectorType)} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectorType]
  );

  return (
    <>
      {isLoading && <EuiLoadingSpinner data-test-subj="connector-card-loading" />}
      {!isLoading && (
        <EuiCard
          data-test-subj={`connector-card`}
          description={description}
          display="plain"
          icon={icon}
          layout="horizontal"
          paddingSize="none"
          title={title}
          titleSize="xs"
        />
      )}
    </>
  );
};

export const ConnectorCard = memo(ConnectorCardDisplay);
