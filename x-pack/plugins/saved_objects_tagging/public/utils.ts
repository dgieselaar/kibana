/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsFindOptionsReference } from '../../../../src/core/server/saved_objects/types';
import type { SavedObject, SavedObjectReference } from '../../../../src/core/types/saved_objects';
import type { Tag } from '../../../../src/plugins/saved_objects_tagging_oss/common/types';
import { tagSavedObjectTypeName } from '../common/constants';

type SavedObjectReferenceLike = SavedObjectReference | SavedObjectsFindOptionsReference;

export {
  replaceTagReferences as updateTagsReferences,
  tagIdToReference,
} from '../common/references';

export const getObjectTags = (object: SavedObject, allTags: Tag[]) => {
  return getTagsFromReferences(object.references, allTags);
};

export const getTagsFromReferences = (references: SavedObjectReference[], allTags: Tag[]) => {
  const tagReferences = references.filter((ref) => ref.type === tagSavedObjectTypeName);

  const foundTags: Tag[] = [];
  const missingRefs: SavedObjectReference[] = [];

  tagReferences.forEach((ref) => {
    const found = allTags.find((tag) => tag.id === ref.id);
    if (found) {
      foundTags.push(found);
    } else {
      missingRefs.push(ref);
    }
  });

  return {
    tags: foundTags,
    missingRefs,
  };
};

export const convertTagNameToId = (tagName: string, allTags: Tag[]): string | undefined => {
  const found = allTags.find((tag) => tag.name === tagName);
  return found?.id;
};

export const byNameTagSorter = (tagA: Tag, tagB: Tag): number => {
  return tagA.name.localeCompare(tagB.name);
};

export const getTag = (tagId: string, allTags: Tag[]): Tag | undefined => {
  return allTags.find(({ id }) => id === tagId);
};

export const testSubjFriendly = (name: string) => {
  return name.replace(' ', '_');
};

export const getTagIdsFromReferences = (references: SavedObjectReferenceLike[]): string[] => {
  return references.filter((ref) => ref.type === tagSavedObjectTypeName).map(({ id }) => id);
};
