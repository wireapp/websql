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

import {Database} from './Database';
import {NULL_PTR, SQLite, __range__} from './Helper';
import {
  sqlite3_bind_blob,
  sqlite3_bind_double,
  sqlite3_bind_int,
  sqlite3_bind_parameter_index,
  sqlite3_bind_text,
  sqlite3_clear_bindings,
  sqlite3_column_blob,
  sqlite3_column_bytes,
  sqlite3_column_double,
  sqlite3_column_name,
  sqlite3_column_text,
  sqlite3_column_type,
  sqlite3_data_count,
  sqlite3_finalize,
  sqlite3_reset,
  sqlite3_step,
} from './lib/sqlite3';
import {BindType, ResultGetType, ValueType} from './StatementInterface';

declare var Module: SQLiteEmscriptenModule;

export const whitelistedFunctions = ['bind', 'get', 'getColumnNames', 'getAsObject', 'free', 'step', 'reset', 'run'];

/**
 * Represents a prepared statement.
 *
 * Prepared statements allow you to use a template SQL string,
 * which you can execute multiple times with different parameters.
 *
 * You can't instantiate this class directly, you have to use a `Database`
 * object in order to create a statement.
 *
 * Statements can't be created by the API user, only by `Database.prepare()`
 *
 * **Warning**: When you close a database (using `db.close()`), all its statements are
 * closed too and become unusable.
 *
 * @see https://en.wikipedia.org/wiki/Prepared_statement
 */
export class Statement {
  private pos: number = 1; // Index of the leftmost parameter is 1
  private readonly allocatedMemory: number[] = []; // Pointers to allocated memory, that need to be freed when the statemend is destroyed

  constructor(private statementPtr: number, private readonly database: Database) {}

  /**
   * Bind values to the parameters, after resetting the statement.
   *
   * SQL statements can have parameters, called `?`, `?NNN`, `:VVV`, `@VVV`, `$VVV`,
   * where `NNN` is a number and `VVV` a string.
   *
   * This function binds these parameters to the given values.
   *
   * **Warning**: `:`, `@`, and `$` are included in the parameter names.
   *
   * **Binding values to named parameters**
   *
   * - Creates a statement that contains parameters like '$VVV', ':VVV', '@VVV'
   * - Calls `Statement.bind` with an object as parameter
   *
   * ```javascript
   * const statement = db.prepare('UPDATE test SET a=@newval WHERE id BETWEEN $mini AND $maxi');
   * statement.bind({$mini:10, $maxi:20, '@newval':5});
   * ```
   *
   * **Binding values to anonymous parameters**
   *
   * - Creates a statement that contains parameters like `?` or `?NNN`
   * - Calls `Statement.bind` with an array as parameter
   *
   * ```javascript
   * const statement = db.prepare('UPDATE test SET a=? WHERE id BETWEEN ? AND ?');
   * statement.bind([5, 10, 20]);
   * ```
   *
   * **Value types**
   *
   * ```
   * | Javascript Type   | SQLite Type   |
   * |-------------------|---------------|
   * | number            | REAL, INTEGER |
   * | boolean           | INTEGER       |
   * | string            | TEXT          |
   * | Array, Uint8Array | BLOB          |
   * | null              | NULL          |
   * ```
   *
   * @see http://www.sqlite.org/datatype3.html
   */
  public bind(values: BindType): boolean {
    if (!this.statementPtr) {
      throw new Error('Statement closed');
    }

    this.reset();

    if (typeof values !== 'object') {
      throw new Error('Could not bind unknown object type');
    }

    if (Array.isArray(values)) {
      return this.bindFromArray(values);
    } else {
      return this.bindFromObject(values);
    }
  }

  /**
   * Execute the statement, fetching the the next line of result,
   * that can be retrieved with `Statement.get()`
   */
  public step(): boolean | void {
    if (!this.statementPtr) {
      throw new Error('Statement closed');
    }

    this.pos = 1;

    const ret = sqlite3_step(this.statementPtr);
    switch (ret) {
      case SQLite.ROW:
        return true;
      case SQLite.DONE:
        return false;
    }

    this.database.handleError(ret);
    return;
  }

  /*
   * Get one row of results of a statement.
   * If the first parameter is not provided, step must have been called before get.
   *
   * **Print all the rows of the table test to the console**
   *
   * ```javascript
   * const statement = db.prepare('SELECT * FROM test');
   * while (statement.step()) console.log(statement.get());
   * ```
   */
  public get(params?: BindType): ResultGetType {
    // Get all fields
    if (params) {
      this.bind(params);
      this.step();
    }

    const result: ResultGetType = [];
    for (
      let field = 0, i = 0, ref = sqlite3_data_count(this.statementPtr);
      0 <= ref ? i < ref : i > ref;
      field = 0 <= ref ? ++i : --i
    ) {
      const value = sqlite3_column_type(this.statementPtr, field);
      switch (value) {
        case SQLite.INTEGER:
        case SQLite.FLOAT:
          result.push(this.getNumber(field));
          break;
        case SQLite.TEXT:
          result.push(this.getString(field));
          break;
        case SQLite.BLOB:
          result.push(this.getBlob(field));
          break;
        default:
          result.push(null);
          break;
      }
    }

    return result;
  }

  /**
   * Get the list of column names of a row of result of a statement.
   * ```javascript
   * const statement = db.prepare('SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;');
   * statement.step(); // Execute the statement
   * console.log(statement.getColumnNames()); // Will print ['nbr', 'data', 'null_value']
   * ```
   */
  public getColumnNames(): string[] {
    return __range__(0, sqlite3_data_count(this.statementPtr), false).map(i =>
      sqlite3_column_name(this.statementPtr, i),
    );
  }

  /**
   * Return all the rows associating column names with their value.
   *
   * ```javascript
   * const statement = db.prepare('SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;');
   * // If you want to bind data you can do: statement.bind({stuff});
   * console.log(statement.getAsObject()); // Will print [{nbr: 5, data: Uint8Array([1, 2, 3]), null_value: null}]
   *   ```
   */
  public getAsObject(): {[key: string]: any}[] {
    const rowObject: Record<string, ValueType>[] = [];
    let columns: string[] | undefined = undefined;

    while (this.step()) {
      if (!columns) {
        columns = this.getColumnNames();
      }
      const values = this.get();
      const row: Record<string, ValueType> = {};
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = values[i];
      }
      rowObject.push(row);
    }

    return rowObject;
  }

  /**
   * Shorthand for `bind()` + `step()` + `reset()`
   * Bind the values, execute the statement, ignoring the rows it returns, and resets it
   */
  public run(values: BindType): void {
    if (values) {
      this.bind(values);
    }
    this.step();
    this.reset();
  }

  /**
   * Reset a statement, so that it's parameters can be bound to new values
   * It also clears all previous bindings, freeing the memory used by bound parameters.
   */
  public reset(): boolean {
    this.freemem();
    return sqlite3_clear_bindings(this.statementPtr) === SQLite.OK && sqlite3_reset(this.statementPtr) === SQLite.OK;
  }

  /**
   * Free the memory used by the statement
   */
  public free(): boolean {
    this.freemem();

    const res = sqlite3_finalize(this.statementPtr) === SQLite.OK;
    delete this.database.statements[this.statementPtr];
    this.statementPtr = NULL_PTR;

    return res;
  }

  // Internal methods

  /** Retrieve data from the results of a statement that has been executed */
  private getNumber(pos: number = this.pos++): number {
    return sqlite3_column_double(this.statementPtr, pos);
  }

  private getString(pos: number = this.pos++): string {
    return sqlite3_column_text(this.statementPtr, pos);
  }

  private getBlob(pos: number = this.pos++): Uint8Array {
    const size = sqlite3_column_bytes(this.statementPtr, pos);
    const ptr = sqlite3_column_blob(this.statementPtr, pos);
    const result = new Uint8Array(size);
    for (let i = 0, end = size, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      result[i] = Module.HEAP8[ptr + i];
    }
    return result;
  }

  /** Free the memory allocated during parameter binding */
  private freemem(): void {
    let mem: number | undefined;
    while ((mem = this.allocatedMemory.pop())) {
      Module._free(mem);
    }
  }

  /** Bind values to parameters */
  private bindString(string: string, pos: number = this.pos++): boolean {
    const bytes = Module.intArrayFromString(string);
    const strptr = Module.allocate(bytes, 'i8', Module.ALLOC_NORMAL, NULL_PTR);
    this.allocatedMemory.push(strptr);
    this.database.handleError(sqlite3_bind_text(this.statementPtr, pos, strptr, bytes.length - 1, 0));
    return true;
  }

  private bindBlob(array: number[], pos: number = this.pos++): boolean {
    const blobptr = Module.allocate(array, 'i8', Module.ALLOC_NORMAL, NULL_PTR);
    this.allocatedMemory.push(blobptr);
    this.database.handleError(sqlite3_bind_blob(this.statementPtr, pos, blobptr, array.length, 0));
    return true;
  }

  private bindNumber(num: number, pos: number = this.pos++): boolean {
    const IS_INT = num | 0;
    const bindfunc = num === IS_INT ? sqlite3_bind_int : sqlite3_bind_double;
    this.database.handleError(bindfunc(this.statementPtr, pos, num));
    return true;
  }

  private bindNull(pos: number = this.pos++): boolean {
    return sqlite3_bind_blob(this.statementPtr, pos, 0, 0, 0) === SQLite.OK;
  }

  // Call bindNumber or bindString appropriately
  private bindValue(value: any, pos: number = this.pos++): boolean {
    switch (typeof value) {
      case 'string':
        return this.bindString(value, pos);
      case 'number':
        return this.bindNumber(value, pos);
      case 'boolean':
        return this.bindNumber(value ? 1 : 0, pos);
      case 'object':
        if (value === null) {
          return this.bindNull(pos);
        } else if (value.length != null) {
          return this.bindBlob(value, pos);
        }
        break;
      case 'undefined':
        return this.bindNull(pos);
    }

    throw new Error(`Wrong API use: tried to bind a value of an unknown type (${value}).`);
  }

  /** Bind names and values of an object to the named parameters of the statement */
  private bindFromObject(valuesObj: BindType): boolean {
    for (const name in valuesObj) {
      const value = valuesObj[name as keyof BindType];
      const num = sqlite3_bind_parameter_index(this.statementPtr, name);
      if (num !== 0) {
        this.bindValue(value, num);
      }
    }
    return true;
  }

  // Bind values to numbered parameters
  private bindFromArray(values: any[]): boolean {
    for (let num = 0; num < values.length; num++) {
      const value = values[num];
      this.bindValue(value, num + 1);
    }
    return true;
  }
}
