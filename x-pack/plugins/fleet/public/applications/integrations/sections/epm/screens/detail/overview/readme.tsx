/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingContent, EuiText } from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { sendGetFileByPath } from '../../../../../../../hooks/use_request/epm';
import { useLinks } from '../../../../../hooks/use_links';

import { markdownRenderers } from './markdown_renderers';

export function Readme({
  readmePath,
  packageName,
  version,
}: {
  readmePath: string;
  packageName: string;
  version: string;
}) {
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const { toRelativeImage } = useLinks();
  const handleImageUri = React.useCallback(
    (uri: string) => {
      const isRelative =
        uri.indexOf('http://') === 0 || uri.indexOf('https://') === 0 ? false : true;
      const fullUri = isRelative ? toRelativeImage({ packageName, version, path: uri }) : uri;
      return fullUri;
    },
    [toRelativeImage, packageName, version]
  );

  useEffect(() => {
    sendGetFileByPath(readmePath).then((res) => {
      setMarkdown(res.data || '');
    });
  }, [readmePath]);

  return (
    <Fragment>
      {markdown !== undefined ? (
        <ReactMarkdown
          transformImageUri={handleImageUri}
          renderers={markdownRenderers}
          source={markdown}
        />
      ) : (
        <EuiText>
          {/* simulates a long page of text loading */}
          <p>
            <EuiLoadingContent lines={5} />
          </p>
          <p>
            <EuiLoadingContent lines={6} />
          </p>
          <p>
            <EuiLoadingContent lines={4} />
          </p>
        </EuiText>
      )}
    </Fragment>
  );
}
