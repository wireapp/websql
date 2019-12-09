import { DatabaseWorkerOptions } from './WorkerInterface';
export declare class Database {
    readonly workerUrl: string;
    readonly options: DatabaseWorkerOptions;
    static readonly mountName = "/sqleet";
    private static readonly isNodejs;
    private static readonly isSharedWorkerSupported;
    private static readonly isWorkerSupported;
    private static readonly isIEOrLegacyEdge;
    private static MessageChannel;
    private readonly worker;
    private databaseInstanceCreated;
    constructor(workerUrl: string, options?: DatabaseWorkerOptions);
    private createNewProxy;
    /** Create the database instance on the worker */
    private createDatabaseInstance;
    private remapper;
    private static translateError;
    private readonly postMessageToWorker;
}
