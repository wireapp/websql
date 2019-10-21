export declare class MessageQueue {
    private static processing;
    private static readonly queue;
    static add(event: any): Promise<void>;
    private static process;
}
