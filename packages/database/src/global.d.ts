declare function __non_webpack_require__(module: string): any;

// Declare globals exposed by WASM

// Declare functions from exports/runtime_methods.json
declare function stackAlloc(ptr: number): number;
declare function stackSave(): number;
declare function stackRestore(ptr: number): void;

declare function allocateUTF8OnStack(str: string): number;
declare function removeFunction(index: number): void;
declare function addFunction(func: Function, sig?: any): number;

declare interface ConnectionOptions {
  vfs?: string;
  mode?: "ro" | "rw" | "rwc" | "memory";
  cache?: "shared" | "private";
  psow?: boolean;
  nolock?: boolean;
  immutable?: boolean;
  salt?: string;
  header?: unknown;
  kdf?: string;
  skip?: unknown;
  page_size?: unknown;
  key: string;
}
