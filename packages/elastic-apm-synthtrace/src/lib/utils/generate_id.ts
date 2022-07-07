/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

let seq = 0;
let startDate = Date.now();
let localSeed = String(Math.floor(Math.random() * 999));
function generateId(seed?: string, length: number = 32) {
  const str = seed ?? String(seq++);
  return str.padStart(length, '0');
}

export function generateShortId(seed?: string) {
  return seed ? generateId(seed, 16) : generateId(`${localSeed}${(startDate) + seq++}`, 16);
}

export function generateLongId(seed?: string) {
  return seed ? generateId(seed, 32) : generateId(`${String(Math.floor(Math.random() * 99999))}a${localSeed}${String((startDate * 1000000) + seq++)}`, 32);
}
