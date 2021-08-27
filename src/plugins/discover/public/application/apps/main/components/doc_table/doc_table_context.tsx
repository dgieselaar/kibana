/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { Fragment } from 'react';
import { SkipBottomButton } from '../skip_bottom_button/skip_bottom_button';
import type { DocTableProps, DocTableRenderProps } from './doc_table_wrapper';
import { DocTableWrapper } from './doc_table_wrapper';
import './index.scss';

const DocTableWrapperMemoized = React.memo(DocTableWrapper);

const renderDocTable = (tableProps: DocTableRenderProps) => {
  return (
    <Fragment>
      <SkipBottomButton onClick={tableProps.onSkipBottomButtonClick} />
      <table className="kbn-table table" data-test-subj="docTable">
        <thead>{tableProps.renderHeader()}</thead>
        <tbody>{tableProps.renderRows(tableProps.rows)}</tbody>
      </table>
      <span tabIndex={-1} id="discoverBottomMarker">
        &#8203;
      </span>
    </Fragment>
  );
};

export const DocTableContext = (props: DocTableProps) => {
  return <DocTableWrapperMemoized {...props} render={renderDocTable} />;
};
