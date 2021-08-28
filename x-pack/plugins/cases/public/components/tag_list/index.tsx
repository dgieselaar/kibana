/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { Field } from '../../../../../../src/plugins/es_ui_shared/static/forms/components/field';
import { Form } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form';
import { FormDataProvider } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form_data_provider';
import { getUseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { useForm } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { useGetTags } from '../../containers/use_get_tags';
import { schema } from './schema';
import { Tags } from './tags';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

export interface TagListProps {
  userCanCrud?: boolean;
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    width: 100%;
    margin-top: ${theme.eui.euiSizeM};
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

const ColumnFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      max-width: 100%;
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.m}) {
        flex-direction: row;
      }
    }
  `}
`;

export const TagList = React.memo(
  ({ userCanCrud = true, isLoading, onSubmit, tags }: TagListProps) => {
    const initialState = { tags };
    const { form } = useForm({
      defaultValue: initialState,
      options: { stripEmptyFields: false },
      schema,
    });
    const { submit } = form;
    const [isEditTags, setIsEditTags] = useState(false);

    const onSubmitTags = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      if (isValid && newData.tags) {
        onSubmit(newData.tags);
        setIsEditTags(false);
      }
    }, [onSubmit, submit]);

    const { tags: tagOptions } = useGetTags();
    const [options, setOptions] = useState(
      tagOptions.map((label) => ({
        label,
      }))
    );

    useEffect(
      () =>
        setOptions(
          tagOptions.map((label) => ({
            label,
          }))
        ),
      [tagOptions]
    );
    return (
      <EuiText>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <h4>{i18n.TAGS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="tag-list-loading" />}
          {!isLoading && userCanCrud && (
            <EuiFlexItem data-test-subj="tag-list-edit" grow={false}>
              <EuiButtonIcon
                data-test-subj="tag-list-edit-button"
                aria-label={i18n.EDIT_TAGS_ARIA}
                iconType={'pencil'}
                onClick={setIsEditTags.bind(null, true)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="none" data-test-subj="case-tags">
          {tags.length === 0 && !isEditTags && <p data-test-subj="no-tags">{i18n.NO_TAGS}</p>}
          {!isEditTags && (
            <EuiFlexItem>
              <Tags tags={tags} color="hollow" />
            </EuiFlexItem>
          )}
          {isEditTags && (
            <ColumnFlexGroup data-test-subj="edit-tags" direction="column">
              <EuiFlexItem>
                <Form form={form}>
                  <CommonUseField
                    path="tags"
                    componentProps={{
                      idAria: 'caseTags',
                      'data-test-subj': 'caseTags',
                      euiFieldProps: {
                        fullWidth: true,
                        placeholder: '',
                        options,
                        noSuggestions: false,
                      },
                    }}
                  />
                  <FormDataProvider pathsToWatch="tags">
                    {({ tags: anotherTags }) => {
                      const current: string[] = options.map((opt) => opt.label);
                      const newOptions = anotherTags.reduce((acc: string[], item: string) => {
                        if (!acc.includes(item)) {
                          return [...acc, item];
                        }
                        return acc;
                      }, current);
                      if (!isEqual(current, newOptions)) {
                        setOptions(
                          newOptions.map((label: string) => ({
                            label,
                          }))
                        );
                      }
                      return null;
                    }}
                  </FormDataProvider>
                </Form>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="secondary"
                      data-test-subj="edit-tags-submit"
                      fill
                      iconType="save"
                      onClick={onSubmitTags}
                      size="s"
                    >
                      {i18n.SAVE}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="edit-tags-cancel"
                      iconType="cross"
                      onClick={setIsEditTags.bind(null, false)}
                      size="s"
                    >
                      {i18n.CANCEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </ColumnFlexGroup>
          )}
        </MyFlexGroup>
      </EuiText>
    );
  }
);

TagList.displayName = 'TagList';
