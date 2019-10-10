declare function __non_webpack_require__(module: string): any;
declare function stackAlloc(ptr: number): number;
declare function stackSave(): number;
declare function stackRestore(ptr: number): void;
declare function allocateUTF8OnStack(str: string): number;
declare function removeFunction(index: number): void;
declare function addFunction(func: Function, sig?: any): number;
