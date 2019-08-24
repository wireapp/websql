import {
  Database,
  whitelistedFunctions as DatabaseWhitelistedFunctions
} from "./Database";
import { whitelistedFunctions as StatementWhitelistedFunctions } from "./Statement";
//import { isSharedWorkerSupported } from "./Helper";

export default class EventHandler {
  private static DatabaseInstance?: Database;
  private static readonly statementFunctionName = "statements.";

  private static replyToOrigin(data: any, event: any): void {
    const port = event.ports[0];
    if (!port) {
      throw new Error("Unable to reply to origin");
    }
    port.postMessage(data);
  }

  private static throwError(errorContent: Error, event: any): void {
    // For some unknown reason the optimizer is not destructuring the error variable, access it directly instead
    this.replyToOrigin(
      {
        error: {
          name: errorContent.name.toString(),
          stack: (errorContent.stack ? errorContent.stack.toString() : undefined),
          message: errorContent.message.toString()
        }
      },
      event
    );
  }

  public static async onMessageReceived(event: any): Promise<void> {
    const args = event.data.args;
    const functionName = event.data.functionName;

    // Handle the init of the constructor
    if (functionName === "constructor") {
      if (!this.DatabaseInstance) {
        this.DatabaseInstance = new Database();
      }
      return this.replyToOrigin({ error: false, output: undefined }, event);
    }

    if (!this.DatabaseInstance) {
      return this.throwError(
        new Error("Database has not been initialized, you must do it first"),
        event
      );
    }

    // Remapper
    let output;
    try {
      const isStatementCall = functionName.startsWith(
        this.statementFunctionName
      );
      if (isStatementCall) {
        const statementFunctionName = functionName.substr(
          this.statementFunctionName.length
        );
        if (!StatementWhitelistedFunctions.includes(statementFunctionName)) {
          throw new Error(
            `Function "${statementFunctionName}" either does not exist or is not allowed to be called from the proxy (Statement)`
          );
        }
        const statementId = Number(event.data.statementId);
        output = this.DatabaseInstance.statements[statementId][
          statementFunctionName
        ](...args);
      } else {
        if (!DatabaseWhitelistedFunctions.includes(functionName)) {
          throw new Error(
            `Function "${functionName}" either does not exist or is not allowed to be called from the proxy (Database)`
          );
        }
        output = await this.DatabaseInstance[functionName](...args);
      }
    } catch (error) {
      return this.throwError(error, event);
    }

    return this.replyToOrigin({ error: false, output }, event);
  }
}
