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

declare function __non_webpack_require__(module: string): any;

// Declare globals exposed by WASM

// Declare functions from exports/runtime_methods.json
declare function stackAlloc(ptr: number): number;
declare function stackSave(): number;
declare function stackRestore(ptr: number): void;

declare function allocateUTF8OnStack(str: string): number;
declare function removeFunction(index: number): void;
declare function addFunction(func: Function, sig?: any): number;

// Exported methods via `-s EXTRA_EXPORTED_RUNTIME_METHODS`, see `runtime_methods.json`.
interface SQLiteEmscriptenModule extends EmscriptenModule {
  ALLOC_DYNAMIC: typeof ALLOC_DYNAMIC;
  ALLOC_NONE: typeof ALLOC_NONE;
  ALLOC_NORMAL: typeof ALLOC_NORMAL;
  ALLOC_STACK: typeof ALLOC_STACK;
  allocate: typeof allocate;
  cwrap: typeof cwrap;
  getValue: typeof getValue;
  intArrayFromString: typeof intArrayFromString;
  setValue: typeof setValue;
  stackAlloc: typeof stackAlloc;
  stackRestore: typeof stackRestore;
  stackSave: typeof stackSave;
}
