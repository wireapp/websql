/// <reference types="@types/emscripten" />
declare function __non_webpack_require__(module: string): any;
declare function stackAlloc(ptr: number): number;
declare function stackSave(): number;
declare function stackRestore(ptr: number): void;
declare function allocateUTF8OnStack(str: string): number;
declare function removeFunction(index: number): void;
declare function addFunction(func: Function, sig?: any): number;
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
