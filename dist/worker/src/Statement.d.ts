import { Database } from './Database';
import { BindType, ResultGetType } from './StatementInterface';
export declare const whitelistedFunctions: string[];
export declare class Statement {
    private statementPtr;
    private readonly database;
    private pos;
    private readonly allocatedMemory;
    constructor(statementPtr: number, database: Database);
    bind(values: BindType): boolean;
    step(): boolean | void;
    get(params?: BindType): ResultGetType;
    getColumnNames(): string[];
    getAsObject(): {
        [key: string]: any;
    }[];
    run(values: BindType): void;
    reset(): boolean;
    free(): boolean;
    private getNumber;
    private getString;
    private getBlob;
    private freemem;
    private bindString;
    private bindBlob;
    private bindNumber;
    private bindNull;
    private bindValue;
    private bindFromObject;
    private bindFromArray;
}
