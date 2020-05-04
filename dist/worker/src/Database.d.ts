import { ConnectionOptions, ExecResultInterface, ParamsInterface } from './DatabaseInterface';
import { SQLite } from './Helper';
import { Statement } from './Statement';
export declare const whitelistedFunctions: string[];
export declare class Database {
    private databaseInstancePtr?;
    private idbfsMounted;
    private options?;
    private identifier?;
    private nodeDatabaseDir?;
    private static readonly metadataTableName;
    static readonly mountName = "/sqleet";
    private static readonly databaseExtension;
    /** A list of all prepared statements of the database */
    statements: Record<number, Statement>;
    constructor();
    mount(options: ConnectionOptions, identifier?: string, nodeDatabaseDir?: string): Promise<void>;
    private static readonly getDatabasePath;
    private ensureFilesystemIsMounted;
    get isMounted(): boolean;
    /**
     * Save and close the database, and all associated prepared statements.
     *
     * The memory associated to the database and all associated statements
     * will be freed.
     *
     * **Warning**: A statement belonging to a database that has been closed cannot
     * be used anymore.
     */
    close(saveAfterClose?: boolean): Promise<void>;
    /** Persist data on disk */
    saveChanges(): Promise<void>;
    /** Sync the filesystem using the internal emcc function */
    private sync;
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
    run(query: string, params?: ParamsInterface): Promise<void>;
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
    execute(query: string): Promise<ExecResultInterface[]>;
    /** Prepare an SQL statement */
    prepare(query: string, params?: ParamsInterface): number;
    export(encoding?: 'binary'): Promise<Uint8Array>;
    export(encoding: 'utf8'): Promise<string>;
    /**
     * Delete the database
     *
     * Same as `close()` but also removes the database from IndexedDB.
     */
    wipe(identifier: string): Promise<void>;
    /**
     * Returns the number of rows modified, inserted or deleted by the
     * most recently completed `INSERT`, `UPDATE` or `DELETE` statement on the
     * database. Executing any other type of SQL statement does not modify
     * the value returned by this function.
     */
    getRowsModified(): Promise<number>;
    isOpen(): Promise<boolean>;
    private ensureDatabaseIsOpen;
    /**
     * Analyze a result code and return `void` if no error occured,
     * otherwise throw an error with a descriptive message
     */
    handleError(returnCode: SQLite): void;
}
