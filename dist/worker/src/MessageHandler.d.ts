export default class EventHandler {
    private static DatabaseInstance?;
    private static readonly statementFunctionName;
    private static replyToOrigin;
    private static throwError;
    static onMessageReceived(event: any): Promise<void>;
}
