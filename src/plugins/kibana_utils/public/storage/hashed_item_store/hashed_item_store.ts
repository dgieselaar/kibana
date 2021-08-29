/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pull, sortBy } from 'lodash';
import type { IStorage } from '../types';

interface IndexedItem {
  hash: string;
  touched?: number; // Date.now()
}

export class HashedItemStore implements IStorage<string, boolean> {
  static readonly PERSISTED_INDEX_KEY = 'kbn.hashedItemsIndex.v1';
  private storage: Storage;

  /**
   * HashedItemStore uses objects called indexed items to refer to items that have been persisted
   * in storage. An indexed item is shaped {hash, touched}. The touched date is when the item
   * was last referenced by the browser history.
   */
  constructor(storage: Storage) {
    this.storage = storage;
  }

  setItem(hash: string, item: string): boolean {
    const isItemPersisted = this.persistItem(hash, item);

    if (isItemPersisted) {
      this.touchHash(hash);
    }

    return isItemPersisted;
  }

  getItem(hash: string): string | null {
    const item = this.storage.getItem(hash);

    if (item !== null) {
      this.touchHash(hash);
    }

    return item;
  }

  removeItem(hash: string): string | null {
    const indexedItems = this.getIndexedItems();
    const itemToRemove = this.storage.getItem(hash);
    const indexedItemToRemove = this.getIndexedItem(hash, indexedItems);

    if (indexedItemToRemove) {
      pull(indexedItems, indexedItemToRemove);
      this.setIndexedItems(indexedItems);
    }

    if (itemToRemove) {
      this.storage.removeItem(hash);
    }

    return itemToRemove || null;
  }

  clear() {
    const indexedItems = this.getIndexedItems();
    indexedItems.forEach(({ hash }) => {
      this.storage.removeItem(hash);
    });
    this.setIndexedItems([]);
  }

  // Store indexed items in descending order by touched (oldest first, newest last). We'll use
  // this to remove older items when we run out of storage space.
  private ensuredSorting = false;
  private getIndexedItems(): IndexedItem[] {
    // Restore a previously persisted index
    const persistedItemIndex = this.storage.getItem(HashedItemStore.PERSISTED_INDEX_KEY);
    let items = persistedItemIndex ? JSON.parse(persistedItemIndex) || [] : [];

    // ensure sorting once, as sorting all indexed items on each get is a performance hit
    if (!this.ensuredSorting) {
      items = sortBy(items, 'touched');
      this.setIndexedItems(items);
      this.ensuredSorting = true;
    }

    return items;
  }

  private setIndexedItems(items: IndexedItem[]) {
    this.storage.setItem(HashedItemStore.PERSISTED_INDEX_KEY, JSON.stringify(items));
  }

  private getIndexedItem(hash: string, indexedItems: IndexedItem[] = this.getIndexedItems()) {
    return indexedItems.find((indexedItem) => indexedItem.hash === hash);
  }

  private persistItem(hash: string, item: string): boolean {
    try {
      this.storage.setItem(hash, item);
      return true;
    } catch (e) {
      // If there was an error then we need to make some space for the item.
      if (this.getIndexedItems().length === 0) {
        // If there's nothing left to remove, then we've run out of space and we're trying to
        // persist too large an item.
        return false;
      }

      // We need to try to make some space for the item by removing older items (i.e. items that
      // haven't been accessed recently).
      this.removeOldestItem();

      // Try to persist again.
      return this.persistItem(hash, item);
    }
  }

  private removeOldestItem() {
    const indexedItems = this.getIndexedItems();
    const oldestIndexedItem = indexedItems.shift();
    if (oldestIndexedItem) {
      // Remove oldest item from storage.
      this.storage.removeItem(oldestIndexedItem.hash);
      this.setIndexedItems(indexedItems);
    }
  }

  private touchHash(hash: string) {
    const indexedItems = this.getIndexedItems();
    // Touching a hash indicates that it's been used recently, so it won't be the first in line
    // when we remove items to free up storage space.

    // either get or create an indexedItem
    const indexedItem = this.getIndexedItem(hash, indexedItems) || { hash };

    // set/update the touched time to now so that it's the "newest" item in the index
    indexedItem.touched = Date.now();

    // ensure that the item is last in the index
    pull(indexedItems, indexedItem);
    indexedItems.push(indexedItem);

    // Regardless of whether this is a new or updated item, we need to persist the index.
    this.setIndexedItems(indexedItems);
  }
}
