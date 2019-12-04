export declare type ExecResultInterface = {
    columns: string[];
    values: any[];
};
export declare type ParamsInterface = any[] | {
    [key: string]: any;
};
export interface ConnectionOptions {
    cache?: 'shared' | 'private';
    header?: unknown;
    immutable?: boolean;
    kdf?: string;
    key: string;
    mode?: 'ro' | 'rw' | 'rwc' | 'memory';
    nolock?: boolean;
    page_size?: unknown;
    psow?: boolean;
    salt?: string;
    skip?: unknown;
    vfs?: string;
}
