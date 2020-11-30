/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef } from 'react';
import { Editor } from 'brace';
import 'brace/ext/language_tools';
import { EuiCodeEditor } from '@elastic/eui';
import { last } from 'lodash';
import { EQL_THEME_NAME } from './constants';
import { EQLCodeEditorCompleter } from './completer';
import { EQLMode } from './eql_mode';
import './theme';
import { EQLCodeEditorProps } from './types';

export function EQLCodeEditor(props: EQLCodeEditorProps) {
  const {
    showGutter = false,
    setOptions,
    getSuggestions,
    ...restProps
  } = props;

  const completer = useRef(new EQLCodeEditorCompleter());
  const eqlMode = useRef(new EQLMode());

  completer.current.setSuggestionCb(getSuggestions);

  const options = {
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    wrap: true,
    ...setOptions,
  };

  return (
    <div className="euiTextArea">
      <EuiCodeEditor
        showGutter={showGutter}
        mode={eqlMode.current}
        theme={last(EQL_THEME_NAME.split('/'))}
        setOptions={options}
        ref={(editor) => {
          if (editor?.aceEditor?.editor) {
            const aceEditor = editor.aceEditor.editor as Editor;
            // @ts-expect-error Property 'completers' does not exist on type 'Editor'
            aceEditor.completers = [completer.current];
          }
        }}
        {...restProps}
      />
    </div>
  );
}
