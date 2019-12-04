/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

declare const self: any;

/** Null pointer */
export const NULL_PTR = 0;

// SQLite interface
export enum SQLite {
  OK = 0,
  ERROR = 1,
  INTERNAL = 2,
  PERM = 3,
  ABORT = 4,
  BUSY = 5,
  LOCKED = 6,
  NOMEM = 7,
  READONLY = 8,
  INTERRUPT = 9,
  IOERR = 10,
  CORRUPT = 11,
  NOTFOUND = 12,
  FULL = 13,
  CANTOPEN = 14,
  PROTOCOL = 15,
  EMPTY = 16,
  SCHEMA = 17,
  TOOBIG = 18,
  CONSTRAINT = 19,
  MISMATCH = 20,
  MISUSE = 21,
  NOLFS = 22,
  AUTH = 23,
  FORMAT = 24,
  RANGE = 25,
  NOTADB = 26,
  NOTICE = 27,
  WARNING = 28,
  ROW = 100,
  DONE = 101,

  // Data types
  INTEGER = 1,
  FLOAT = 2,
  TEXT = 3,
  BLOB = 4,
  NULL = 5,

  // Encodings, used for registering functions
  UTF8 = 1,
}

export function __range__(left: number, right: number, inclusive: any): number[] {
  const range: number[] = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}

export class ExtendableError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
    if (typeof Error['captureStackTrace'] === 'function') {
      Error['captureStackTrace'](this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

export const isSharedWorkerSupported = typeof self !== 'undefined' && typeof self.onconnect !== 'undefined';
export const isNodejs =
  typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';

export const DatabaseAlreadyMountedError = (message: string) =>
  new ExtendableError(message, 'DatabaseAlreadyMountedError');
export const InvalidEncryptionKeyError = (message: string) => new ExtendableError(message, 'InvalidEncryptionKeyError');
