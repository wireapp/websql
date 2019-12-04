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

import {ConnectionOptions, ExecResultInterface, ParamsInterface} from './worker/src/DatabaseInterface';
import {BindType, ResultGetType} from './worker/src/StatementInterface';
import {DatabaseWorkerOptions} from './wrapper/src/WorkerInterface';

// All public functions from Statement are promisified in the proxy
// Statement cannot be instantiated from outside so we can remove the constructor here
declare class Statement {
  bind(values: BindType): Promise<boolean>;
  free(): Promise<boolean>;
  get(params?: BindType): Promise<ResultGetType>;
  getAsObject(): Promise<{[key: string]: any}[]>;
  getColumnNames(): Promise<string[]>;
  reset(): Promise<boolean>;
  run(values: BindType): Promise<void>;
  step(): Promise<boolean | void>;
}

// Because Database in Wrapper is a proxy to the Database class in Worker we have to
// maintain this class declaration manually
// Note: The constructor is from the Wrapper, the rest is from the Worker
export declare class Database {
  static readonly mountName = '/sqleet';
  constructor(workerUrl: string, options?: DatabaseWorkerOptions);
  isOpen(): Promise<boolean>;
  _getWorkerInstance(): Promise<Worker>;
  close(saveAfterClose?: boolean): Promise<void>;
  execute(query: string): Promise<ExecResultInterface[]>;
  export(encoding: 'utf8'): Promise<string>;
  export(encoding?: 'binary'): Promise<Uint8Array>;
  getRowsModified(): Promise<number>;
  mount(options: ConnectionOptions, identifier?: string, nodeDatabaseDir?: string): Promise<void>;
  prepare(query: string, params?: ParamsInterface): Promise<Statement>;
  run(query: string, params?: ParamsInterface): Promise<void>;
  saveChanges(): Promise<void>;
  wipe(identifier: string): Promise<void>;
}
