import { ConnectionOptions, ExecResultInterface, ParamsInterface } from './worker/src/DatabaseInterface';
import { BindType, ResultGetType } from './worker/src/StatementInterface';
import { DatabaseWorkerOptions } from './wrapper/src/WorkerInterface';
declare class Statement {
    bind(values: BindType): Promise<boolean>;
    free(): Promise<boolean>;
    get(params?: BindType): Promise<ResultGetType>;
    getAsObject(): Promise<{
        [key: string]: any;
    }[]>;
    getColumnNames(): Promise<string[]>;
    reset(): Promise<boolean>;
    run(values: BindType): Promise<void>;
    step(): Promise<boolean | void>;
}
export declare class Database {
    static readonly mountName = "/sqleet";
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
export {};
