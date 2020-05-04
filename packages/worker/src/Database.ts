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

import {ConnectionOptions, ExecResultInterface, ParamsInterface} from './DatabaseInterface';
import {DatabaseAlreadyMountedError, InvalidEncryptionKeyError, NULL_PTR, SQLite, isNodejs} from './Helper';
import {
  RegisterExtensionFunctions,
  sqlite3_changes,
  sqlite3_close_v2,
  sqlite3_errmsg,
  sqlite3_exec,
  sqlite3_open,
  sqlite3_prepare_v2,
  sqlite3_prepare_v2_sqlptr,
} from './lib/sqlite3';
import {Statement} from './Statement';

const apiTemp = stackAlloc(4);

declare const URLSearchParams: any;
declare var Module: SQLiteEmscriptenModule;

export const whitelistedFunctions = [
  'close',
  'execute',
  'export',
  'getRowsModified',
  'isOpen',
  'mount',
  'prepare',
  'run',
  'saveChanges',
  'wipe',
];

export class Database {
  private databaseInstancePtr?: number;
  private idbfsMounted: boolean = false;

  private options?: ConnectionOptions;
  private identifier?: string;
  private nodeDatabaseDir?: string;

  private static readonly metadataTableName = '_sqleet_metadata';
  public static readonly mountName = '/sqleet';
  private static readonly databaseExtension = 'db';

  /** A list of all prepared statements of the database */
  public statements: Record<number, Statement> = {};

  constructor() {}

  // Mount the database
  // TODO: Add a upgrade scheme?
  public async mount(
    options: ConnectionOptions,
    identifier: string = 'default',
    nodeDatabaseDir?: string,
  ): Promise<void> {
    if (this.databaseInstancePtr) {
      throw DatabaseAlreadyMountedError('Database is already mounted');
    }

    if (!options || !options['key']) {
      throw new Error('An encryption key must be set, aborting the mount operation');
    }

    // Update context
    this.options = options;
    this.identifier = identifier;

    // Set the database storage location for Node.JS
    if (isNodejs) {
      if (!nodeDatabaseDir) {
        throw new Error(
          'You need to specify a directory to use to store the database. Check the nodeDatabaseDir option.',
        );
      }
      this.nodeDatabaseDir = nodeDatabaseDir;
    }

    await this.ensureFilesystemIsMounted();

    // Build
    const searchParams = new URLSearchParams();
    for (const option in this.options) {
      searchParams.set(option, this.options[option as keyof ConnectionOptions]);
    }
    const fileUrl = `file:${Database.getDatabasePath(this.identifier)}?${searchParams.toString()}`;

    this.handleError(sqlite3_open(fileUrl, apiTemp));
    this.databaseInstancePtr = Module.getValue(apiTemp, 'i32');

    // Bind custom SQLite functions to this instance (see sqlite/extension-functions.c)
    RegisterExtensionFunctions(this.databaseInstancePtr);

    // Set encoding to UTF-8 and ensure the database was opened correctly
    try {
      // Running `SELECT type FROM SQLITE_MASTER` on Safari will
      // cause "Maximum call stack size exceeded.", create instead
      // the metadata table specific for this engine
      await this.run(
        `PRAGMA encoding="UTF-8"; CREATE TABLE IF NOT EXISTS ${Database.metadataTableName} (key text, value text);`,
      );
    } catch (error) {
      throw InvalidEncryptionKeyError(
        `Encryption key is most likely invalid, you will either need to wipe the database or use another identifier. Original message: ${error.message}`,
      );
    }
  }

  private static readonly getDatabasePath = (identifier: string): string =>
    `${Database.mountName}/${identifier}.${Database.databaseExtension}`;

  private async ensureFilesystemIsMounted(): Promise<void> {
    if (!this.idbfsMounted) {
      FS.mkdir(Database.mountName);
      if (isNodejs) {
        FS.mount(NODEFS, {root: this.nodeDatabaseDir}, Database.mountName);
      } else {
        FS.mount(IDBFS, {}, Database.mountName);
      }

      // Init Emscripten FS with the data from the persistent source
      await this.sync(true);

      // FS.unmount throws some undebuggable errors
      // in close() so let's just add a flag to know
      // it has been mounted once in the FS so we don't
      // need to mount it again
      this.idbfsMounted = true;
    }
  }

  get isMounted(): boolean {
    return this.idbfsMounted;
  }

  /**
   * Save and close the database, and all associated prepared statements.
   *
   * The memory associated to the database and all associated statements
   * will be freed.
   *
   * **Warning**: A statement belonging to a database that has been closed cannot
   * be used anymore.
   */
  public async close(saveAfterClose: boolean = true): Promise<void> {
    if (!this.databaseInstancePtr) {
      throw new Error('Database is already closed');
    }

    // Free and clear all statements
    for (const statement in this.statements) {
      this.statements[statement].free();
    }
    this.statements = {};

    // Close the database internally
    this.handleError(sqlite3_close_v2(this.databaseInstancePtr));

    // Save changes by default
    if (saveAfterClose) {
      await this.saveChanges();
    }

    // Unmount
    //FS.unmount(Database.mountName);
    //FS.rmdir(Database.mountName);
    //this.idbfsMounted = false;

    // Clear the pointer
    this.databaseInstancePtr = undefined;

    // Clear other options
    this.options = undefined;
    this.identifier = undefined;
    this.nodeDatabaseDir = undefined;
  }

  /** Persist data on disk */
  public async saveChanges(): Promise<void> {
    await this.sync(false);
  }

  /** Sync the filesystem using the internal emcc function */
  private sync(populate: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      FS.syncfs(populate, (err: any) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  /**
   * Execute an SQL query, ignoring the rows it returns.
   *
   * If you use the params argument, you **cannot** provide an sql string that contains several
   * queries (separated by ';')
   *
   * **Example**
   *
   * Insert values in a table:
   *
   * ```javascript
   * db.run('INSERT INTO test VALUES (:age, :name)', {':age': 18, ':name': 'John'});
   * ```
   */
  public async run(query: string, params?: ParamsInterface): Promise<void> {
    this.ensureDatabaseIsOpen();
    if (params) {
      const statementId = await this.prepare(query, params);
      this.statements[statementId].step();
      this.statements[statementId].free();
    } else {
      this.handleError(sqlite3_exec(this.databaseInstancePtr, query, 0, 0, apiTemp));
    }
  }

  /**
   * Executes an SQL query and returns the result.
   *
   * This is a wrapper against `Database.prepare`, `Statement.execute`, `Statement.get`,
   * and `Statement.free`.
   *
   * The result is an array of result elements. There are as many result elements
   * as the number of statements in your sql string (statements are separated by a semicolon)
   *
   * Each result element is an object with two properties:
   *  * `columns`: the name of the columns of the result (as returned by `Statement.getColumnNames()`)
   *  * `values`: an array of rows. Each row is itself an array of values
   *
   * **Example**
   *
   * We have the following table, named `test`:
   *
   * ```
   * | id | age | name   |
   * |----|-----|--------|
   * | 1  | 1   | Ling   |
   * | 2  | 18  | Paul   |
   * | 3  | 3   | Markus |
   * ```
   *
   * We query it like this:
   *
   * ```javascript
   * const db = new SQL.Database();
   * const res = db.execute('SELECT id FROM test; SELECT age,name FROM test;');
   * ```
   *
   * `res` is now:
   * ```javascript
   * [
   *   {columns: ['id'], values: [[1], [2], [3]]},
   *   {columns: ['age', 'name'], values: [[1, 'Ling'], [18 , 'Paul'], [3, 'Markus']]}
   * ]
   * ```
   */
  public async execute(query: string): Promise<ExecResultInterface[]> {
    this.ensureDatabaseIsOpen();

    const stack: number = stackSave();

    // Store the SQL string in memory. The string will be consumed, one statement
    // at a time, by sqlite3_prepare_v2_sqlptr.
    // Note that if we want to allocate as much memory as could _possibly_ be used, we can
    // we allocate bytes equal to 4* the number of chars in the sql string.
    // It would be faster, but this is probably a premature optimization
    let nextSqlPtr = allocateUTF8OnStack(query);

    // Used to store a pointer to the next SQL statement in the string
    const pzTail = stackAlloc(4);

    const results: ExecResultInterface[] = [];
    while (Module.getValue(nextSqlPtr, 'i8') !== NULL_PTR) {
      Module.setValue(apiTemp, 0, 'i32');
      Module.setValue(pzTail, 0, 'i32');

      this.handleError(sqlite3_prepare_v2_sqlptr(this.databaseInstancePtr, nextSqlPtr, -1, apiTemp, pzTail));
      const pointerStatement = Module.getValue(apiTemp, 'i32'); // Pointer to a statement, or null
      nextSqlPtr = Module.getValue(pzTail, 'i32');

      if (pointerStatement === NULL_PTR) {
        // Empty statement
        continue;
      }

      const statement = new Statement(pointerStatement, this);
      const curresult: ExecResultInterface = {
        columns: [],
        values: [],
      };

      while (statement.step()) {
        if (!curresult.columns) {
          curresult.columns = statement.getColumnNames();
        }
        curresult.values.push(statement.get());
      }
      results.push(curresult);
      statement.free();
    }
    stackRestore(stack);
    return results;
  }

  /** Prepare an SQL statement */
  public prepare(query: string, params?: ParamsInterface): number {
    Module.setValue(apiTemp, 0, 'i32');
    this.handleError(sqlite3_prepare_v2(this.databaseInstancePtr, query, -1, apiTemp, NULL_PTR));

    // Pointer to a statement, or null
    const statementPtr = Module.getValue(apiTemp, 'i32');
    if (statementPtr === NULL_PTR) {
      throw new Error('Nothing to prepare');
    }

    const statement = new Statement(statementPtr, this);
    if (params) {
      statement.bind(params);
    }
    this.statements[statementPtr] = statement;

    return statementPtr;
  }

  // Exports the contents of the database to a binary array
  // Note: Currently on iOS, having around 500k entries will make
  // the web page run out of memory when calling this function
  // TODO: Use an iterative approach (https://developers.redhat.com/blog/2014/05/20/communicating-large-objects-with-web-workers-in-javascript/)
  // FS.read can be used to split the data into chunks, multiple postMessage will be required
  public async export(encoding?: 'binary'): Promise<Uint8Array>;
  public async export(encoding: 'utf8'): Promise<string>;
  public async export(encoding: 'binary' | 'utf8' = 'binary'): Promise<Uint8Array | string> {
    this.ensureDatabaseIsOpen();

    const options = this.options;
    const identifier = this.identifier!;
    const nodeDatabaseDir = this.nodeDatabaseDir;

    await this.close(true);

    const binaryDb = FS.readFile(Database.getDatabasePath(identifier), {encoding: encoding as any});
    await this.mount(options as ConnectionOptions, identifier, nodeDatabaseDir);

    return binaryDb;
  }

  /**
   * Delete the database
   *
   * Same as `close()` but also removes the database from IndexedDB.
   */
  public async wipe(identifier: string): Promise<void> {
    if (this.databaseInstancePtr) {
      throw new Error('Database instance needs to be closed first, use close()');
    }

    await this.ensureFilesystemIsMounted();

    try {
      FS.unlink(Database.getDatabasePath(identifier));
    } catch (error) {
      throw new Error(`Database either does not exist or is already deleted (${error.message})`);
    }

    await this.saveChanges();
  }

  /**
   * Returns the number of rows modified, inserted or deleted by the
   * most recently completed `INSERT`, `UPDATE` or `DELETE` statement on the
   * database. Executing any other type of SQL statement does not modify
   * the value returned by this function.
   */
  public async getRowsModified(): Promise<number> {
    return sqlite3_changes(this.databaseInstancePtr);
  }

  // Utils
  public async isOpen(): Promise<boolean> {
    return !!this.databaseInstancePtr;
  }

  private ensureDatabaseIsOpen(): void {
    if (!this.databaseInstancePtr) {
      throw new Error('Database closed');
    }
  }

  /**
   * Analyze a result code and return `void` if no error occured,
   * otherwise throw an error with a descriptive message
   */
  public handleError(returnCode: SQLite): void {
    if (returnCode !== SQLite.OK) {
      const errmsg = sqlite3_errmsg(this.databaseInstancePtr);
      throw new Error(errmsg);
    }
  }
}
