import { SQLite } from "./packages/worker/src/Helper";
import {ExecResultInterface, ParamsInterface} from "./packages/worker/src/Database";
import { ResultGetType, BindType } from "./packages/worker/src/Statement";
import { DatabaseWorkerOptions } from "./packages/wrapper/src";

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

// All public functions from Statement are promisified in the proxy
// Statement cannot be instantiated from outside so we can remove the constructor here
declare class Statement {
  bind(values: BindType): Promise<boolean>;
  step(): Promise<boolean | void>;
  get(params?: BindType): Promise<ResultGetType>;
  getColumnNames(): Promise<string[]>;
  getAsObject(): Promise<{[key:string]: any}[]>;
  run(values: BindType): Promise<void>;
  reset(): Promise<boolean>;
  free(): Promise<boolean>;
}

// Because Database in Wrapper is a proxy to the Database class in Worker we have to
// maintain this class declaration manually
// Note: The constructor is from the Wrapper, the rest is from the Worker
export declare class Database {
  constructor(workerUrl: string, options?: DatabaseWorkerOptions);
  mount(
    options: ConnectionOptions,
    identifier?: string,
    nodeDatabaseDir?: string
  ): Promise<void>;
  close(saveAfterClose?: boolean): Promise<void>;
  saveChanges(): Promise<void>;
  run(query: string, params?: ParamsInterface): Promise<void>;
  execute(query: string): Promise<ExecResultInterface[]>;
  export(encoding?: "binary" | "utf8"): Promise<Uint8Array | string>;
  wipe(identifier: string): Promise<void>;
  getRowsModified(): Promise<number>;
  prepare(query: string, params?: ParamsInterface): Promise<Statement>;
}

export {};
