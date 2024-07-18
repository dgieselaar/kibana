/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type PlainObject = Record<string, any>;

export function flattenObject(
  obj: PlainObject,
  prefix: string = '',
  result: PlainObject = {}
): PlainObject {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      // If the property value is an object and not an array or null, recurse
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], newKey, result);
      } else {
        // Otherwise, add the value to the result object
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}
