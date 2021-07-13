/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFormControlLayout } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import React, { useEffect, useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import { uniqueId } from 'lodash';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

const js = monaco.languages.getLanguages().find((lang) => lang.id === 'javascript')! as ValuesType<
  ReturnType<typeof monaco.languages.getLanguages>
> & {
  loader: () => Promise<{ language: monaco.languages.IMonarchLanguage & { keywords: string[] } }>;
};

monaco.languages.register({
  id: 'math',
});

monaco.languages.setMonarchTokensProvider(
  'math',
  js.loader().then(({ language }) => {
    return {
      ...language,
      keywords: ['null', 'true', 'false', 'undefined'],
    };
  })
);

export function MetricAlertTrigger({
  value,
  fields,
  onChange,
}: {
  value: string;
  fields: string[];
  onChange: (value: string) => void;
}) {
  const model = useMemo(() => {
    return monaco.editor.createModel(
      '',
      'math',
      monaco.Uri.parse(`elastic://metric-expression.${uniqueId()}.math/`)
    );
  }, []);

  useEffect(() => {
    return () => {
      model.dispose();
    };
  }, [model]);

  const [disposeCompletionProvider, setDisposeCompletionProvider] = useState<
    monaco.IDisposable | undefined
  >();

  return (
    <EuiFormControlLayout
      css=".editor-scrollable {
      left: 8px !important;
    }
    .monaco-editor:not(.focused) .cslr.selected-text {
      background: none;
    }"
    >
      <div className="euiFieldText">
        <CodeEditor
          height="100%"
          languageId="math"
          value={value}
          transparentBackground
          editorDidMount={(editor) => {
            if (disposeCompletionProvider) {
              disposeCompletionProvider.dispose();
            }

            editor.setModel(model);

            setDisposeCompletionProvider(
              monaco.languages.registerCompletionItemProvider('math', {
                provideCompletionItems: (_, position, context, token) => {
                  if (!editor.hasTextFocus()) {
                    return {
                      suggestions: [],
                    };
                  }
                  const word = model.getWordAtPosition(position);
                  return {
                    suggestions: fields.map((field) => {
                      return {
                        label: field,
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: field,
                        range: {
                          startColumn: word?.startColumn ?? position.column,
                          startLineNumber: position.lineNumber,
                          endColumn: word?.startColumn ?? position.column,
                          endLineNumber: position.lineNumber,
                        },
                      };
                    }),
                  };
                },
              })
            );
          }}
          options={{
            fontSize: 12,
            lineHeight: 18,
            minimap: {
              enabled: false,
            },
            wordWrap: 'off',
            wordWrapColumn: 0,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden',
            },
            scrollBeyondLastColumn: 0,
            roundedSelection: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            scrollBeyondLastLine: false,
            wrappingIndent: 'indent',
            suggest: {
              snippetsPreventQuickSuggestions: false,
            },
            lineNumbers: 'off',
          }}
          onChange={(val) => {
            if (model.getLineCount() > 1) {
              const textOfFirstLine = model.getValueInRange({
                startColumn: 0,
                endColumn: Number.POSITIVE_INFINITY,
                startLineNumber: 1,
                endLineNumber: 1,
              });
              model.setValue(textOfFirstLine);
              onChange(textOfFirstLine);
            } else {
              onChange(val);
            }
          }}
        />
      </div>
    </EuiFormControlLayout>
  );
}
