/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useCallback, useEffect, useRef } from 'react';
import cls from 'classnames';

const inputAreaClassName = css`
  width: 100%;
`;

const textAreaClassName = css`
  max-height: 200px;
  padding-top: 10px;
  padding-bottom: 9px;
`;

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onLayoutChange: (props: { height: number }) => void;
  placeholder: string;
  resize: 'none' | 'vertical';
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
}

export function TextInput({
  value,
  onChange,
  onLayoutChange,
  placeholder,
  resize,
  className,
  onFocus,
  onBlur,
  onSubmit,
}: TextInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onLayoutChangeRef = useRef(onLayoutChange);

  const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>
  ) => {
    if (resize !== 'none') {
      handleResizeTextArea();
    }

    onChange(event.currentTarget.value);
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';

      const cappedHeight = Math.min(textAreaRef.current?.scrollHeight, 350);

      textAreaRef.current.style.minHeight = cappedHeight + 'px';

      onLayoutChangeRef.current({ height: cappedHeight });
    }
  }, []);

  useEffect(() => {
    const textarea = textAreaRef.current;

    if (textarea) {
      textarea.focus();
    }
  }, []);

  useEffect(() => {
    handleResizeTextArea();
  }, [handleResizeTextArea]);

  useEffect(() => {
    if (!value) {
      handleResizeTextArea();
    }
  }, [handleResizeTextArea, value]);

  useEffect(() => {
    // Attach the event listener to the window to catch mouseup outside the browser window
    if (resize !== 'none') {
      window.addEventListener('mouseup', handleResizeTextArea);
    }

    return () => {
      window.removeEventListener('mouseup', handleResizeTextArea);
    };
  }, [resize, handleResizeTextArea]);

  const baseClassName = cls(inputAreaClassName, className);

  const props = {
    ['data-test-subj']: 'observabilityAiAssistantTextInput',
    fullWidh: true,
    value,
    onChange: handleChange,
    className,
    placeholder,
    onFocus,
    onBlur,
    onSubmit,
  };

  if (resize === 'none') {
    return <EuiFieldText {...props} />;
  }

  return (
    <EuiTextArea
      {...props}
      inputRef={textAreaRef}
      className={cls(baseClassName, textAreaClassName)}
      resize={resize}
      rows={1}
    />
  );
}
