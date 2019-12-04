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

import {Database, whitelistedFunctions as DatabaseWhitelistedFunctions} from './Database';
import {whitelistedFunctions as StatementWhitelistedFunctions} from './Statement';

export default class EventHandler {
  private static DatabaseInstance?: Database;
  private static readonly statementFunctionName = 'statements.';

  private static replyToOrigin(data: any, event: any): void {
    const port = event.ports[0];
    if (!port) {
      throw new Error('Unable to reply to origin');
    }
    port.postMessage(data);
  }

  private static throwError(errorContent: Error, event: any): void {
    // For some unknown reason the optimizer is not destructuring the error variable, access it directly instead
    this.replyToOrigin(
      {
        error: {
          message: errorContent.message.toString(),
          name: errorContent.name.toString(),
          stack: errorContent.stack ? errorContent.stack.toString() : undefined,
        },
      },
      event,
    );
  }

  public static async onMessageReceived(event: any): Promise<void> {
    const args: any = event.data.args;
    const functionName: string = event.data.functionName;

    // Handle the init of the constructor
    if (functionName === 'constructor') {
      if (!this.DatabaseInstance) {
        this.DatabaseInstance = new Database();
      }
      return this.replyToOrigin({error: false, output: undefined}, event);
    }

    if (!this.DatabaseInstance) {
      return this.throwError(new Error('Database has not been initialized, you must do it first'), event);
    }

    // Remapper
    let output: any;

    try {
      const isStatementCall = functionName.startsWith(this.statementFunctionName);
      if (isStatementCall) {
        const statementFunctionName = functionName.substr(this.statementFunctionName.length);
        if (!StatementWhitelistedFunctions.includes(statementFunctionName)) {
          throw new Error(
            `Function "${statementFunctionName}" either does not exist or is not allowed to be called from the proxy (Statement)`,
          );
        }
        const statementId = Number(event.data.statementId);
        output = (this.DatabaseInstance.statements as any)[statementId][statementFunctionName](...args);
      } else {
        if (!DatabaseWhitelistedFunctions.includes(functionName)) {
          throw new Error(
            `Function "${functionName}" either does not exist or is not allowed to be called from the proxy (Database)`,
          );
        }
        output = await (this.DatabaseInstance as any)[functionName](...args);
      }
    } catch (error) {
      return this.throwError(error, event);
    }

    return this.replyToOrigin({error: false, output}, event);
  }
}
