import { Database } from './Database';
import { BindType, ResultGetType } from './StatementInterface';
export declare const whitelistedFunctions: string[];
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
export declare class Statement {
    private statementPtr;
    private readonly database;
    private pos;
    private readonly allocatedMemory;
    constructor(statementPtr: number, database: Database);
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
    bind(values: BindType): boolean;
    /**
     * Execute the statement, fetching the the next line of result,
     * that can be retrieved with `Statement.get()`
     */
    step(): boolean | void;
    get(params?: BindType): ResultGetType;
    /**
     * Get the list of column names of a row of result of a statement.
     * ```javascript
     * const statement = db.prepare('SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;');
     * statement.step(); // Execute the statement
     * console.log(statement.getColumnNames()); // Will print ['nbr', 'data', 'null_value']
     * ```
     */
    getColumnNames(): string[];
    /**
     * Return all the rows associating column names with their value.
     *
     * ```javascript
     * const statement = db.prepare('SELECT 5 AS nbr, x'616200' AS data, NULL AS null_value;');
     * // If you want to bind data you can do: statement.bind({stuff});
     * console.log(statement.getAsObject()); // Will print [{nbr: 5, data: Uint8Array([1, 2, 3]), null_value: null}]
     *   ```
     */
    getAsObject(): {
        [key: string]: any;
    }[];
    /**
     * Shorthand for `bind()` + `step()` + `reset()`
     * Bind the values, execute the statement, ignoring the rows it returns, and resets it
     */
    run(values: BindType): void;
    /**
     * Reset a statement, so that it's parameters can be bound to new values
     * It also clears all previous bindings, freeing the memory used by bound parameters.
     */
    reset(): boolean;
    /**
     * Free the memory used by the statement
     */
    free(): boolean;
    /** Retrieve data from the results of a statement that has been executed */
    private getNumber;
    private getString;
    private getBlob;
    /** Free the memory allocated during parameter binding */
    private freemem;
    /** Bind values to parameters */
    private bindString;
    private bindBlob;
    private bindNumber;
    private bindNull;
    private bindValue;
    /** Bind names and values of an object to the named parameters of the statement */
    private bindFromObject;
    private bindFromArray;
}
