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

import {isIEOrLegacyEdge} from './Helper';
import {DatabaseWorkerOptions} from './WorkerInterface';

export class Database {
  public static readonly mountName = '/sqleet';
  private static readonly isNodejs =
    typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
  private static readonly isSharedWorkerSupported =
    !Database.isNodejs && typeof window !== 'undefined' && typeof SharedWorker !== 'undefined';
  private static readonly isWorkerSupported =
    !Database.isNodejs && typeof window !== 'undefined' && typeof window.Worker !== 'undefined';

  // It is easier to detect Edge than running a IndexedDB test in a worker
  // as we run everything in the constructor and we don't want async code there
  private static readonly isIEOrLegacyEdge = typeof window !== 'undefined' && isIEOrLegacyEdge();

  private static MessageChannel: new () => MessageChannel;

  private readonly worker: SharedWorker | Worker;
  private databaseInstanceCreated: boolean = false;

  constructor(
    readonly workerUrl: string,
    readonly options: DatabaseWorkerOptions = {
      // Main or Pseudo Web Worker will run within the current thread
      // Same warning as Shared Worker + operations will block the main thread.
      // Useful for browsers which does not support Web Workers properly
      // e.g. Edge does not support window.crypto nor IndexedDB inside Workers
      // which makes the use of this module impossible in a Worker context.
      allowMainWebWorker: false,

      // When Shared Worker is not available, you can use a Web Worker to achieve the same.
      // Be warned that using Web Worker will be an issue if you are running multiple tabs,
      // it is recommended to prevent the opening of multiple database connections to avoid
      // overwrite and data loss.
      allowWebWorkerFallback: false,
    },
  ) {
    if (Database.isNodejs) {
      console.log('websql: Using Node.JS Worker');
      const {MessageChannel, Worker} = __non_webpack_require__('worker_threads');
      this.worker = new Worker(workerUrl);
      Database.MessageChannel = MessageChannel;
    } else if (Database.isSharedWorkerSupported) {
      console.log('websql: Using Shared Worker');
      this.worker = new SharedWorker(workerUrl);
      this.worker.port.start();
    } else if (
      !Database.isSharedWorkerSupported &&
      Database.isWorkerSupported &&
      !Database.isIEOrLegacyEdge &&
      options.allowWebWorkerFallback
    ) {
      console.warn('websql: Using Web Worker. Experience will be degraded.');
      this.worker = new Worker(workerUrl);
    } else if (
      !Database.isSharedWorkerSupported &&
      (!Database.isWorkerSupported || Database.isIEOrLegacyEdge) &&
      options.allowMainWebWorker
    ) {
      console.warn('websql: Using Pseudo Web Worker. Experience will be degraded heavily.');
      console.log('Database.isWorkerSupported ', Database.isWorkerSupported);
      console.log('Database.isIEOrLegacyEdge ', Database.isIEOrLegacyEdge);
      const PseudoWorker = require('pseudo-worker');
      this.worker = new PseudoWorker(workerUrl);
    } else {
      throw new Error(
        'Shared Worker are not available in your browser and Web Worker / Web Worker in Main Thread fallback is disabled. Aborting.',
      );
    }

    if (!Database.isNodejs) {
      // Use browser Message Channel
      Database.MessageChannel = window.MessageChannel;

      // Attempt to save or close the database on unload
      window.addEventListener('unload', async () => {
        if (this.databaseInstanceCreated) {
          if (!Database.isSharedWorkerSupported) {
            // If we use Web Worker then it means this window is the only
            // connection to the database so we can safely close the database connection
            await this.postMessageToWorker('close');
          } else {
            await this.postMessageToWorker('saveChanges');
          }
        }
      });
    }

    // Return a proxy so we can forward all calls to the Worker
    return this.createNewProxy<this>(this, async (calleeName, ...args) => {
      // Hidden API to return the worker instance,
      // mostly used to terminate the worker from outside
      if (calleeName === '_getWorkerInstance') {
        return this.worker;
      }
      if (!this.databaseInstanceCreated) {
        await this.createDatabaseInstance();
      }
      const response = await this.postMessageToWorker(calleeName, args);
      return response;
    });
  }

  private createNewProxy<T>(forwardTo: any, handler: (calleeName: string, ...args: any) => any): T {
    return new Proxy(forwardTo, {
      deleteProperty: () => {
        throw new Error('Forbidden operation, object is frozen');
      },
      get: (_target, calleeName) => {
        // see https://stackoverflow.com/a/53890904
        // This proxy is not thenable
        if (calleeName === 'then') {
          return null;
        }
        return async (...args: any[]) => handler(calleeName.toString(), ...args);
      },
      has: () => {
        throw new Error('Forbidden operation, object is frozen');
      },
      set: () => {
        throw new Error('Forbidden operation, object is frozen');
      },
    });
  }

  /** Create the database instance on the worker */
  private async createDatabaseInstance(): Promise<void> {
    await this.postMessageToWorker('constructor');
    this.databaseInstanceCreated = true;
  }

  private remapper(calleeName: string, output: any): any {
    switch (calleeName) {
      case 'prepare':
        const statementId: number = output;
        // Return a proxy that will forward to the Worker API
        return this.createNewProxy<{}>({}, async (calleeName, ...args) => {
          const response = await this.postMessageToWorker(`statements.${calleeName.toString()}`, args, {statementId});
          return response;
        });
    }
    return output;
  }

  private static translateError(error: Error): Error {
    // Since we cannot postMessage Error instances,
    // this function can recreate Errors based on a
    // similar given object
    const reconstructedError = new Error(error.message);
    reconstructedError.stack = error.stack;
    reconstructedError.name = error.name;
    return reconstructedError;
  }

  private readonly postMessageToWorker = (
    calleeName: string,
    args: any[] = [],
    additionalData: {} = {},
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const messageChannel = new Database.MessageChannel();

      messageChannel.port1.onmessage = event => {
        // Immediately close and free the MessageChannel
        // after use, not closing it causes browsers to
        // slow down, especially Safari
        messageChannel.port1.close();
        const error: Error = event.data.error;
        if (error) {
          return reject(Database.translateError(error));
        }
        const output = this.remapper(calleeName, event.data.output);
        resolve(output);
      };

      const input = {
        args: args.slice(), // Force casting "arguments" into a regular Array
        functionName: calleeName, // Name of the function to call from the worker
        ...additionalData,
      };
      const transfer = [messageChannel.port2];

      if (Database.isNodejs) {
        // Send manually the port to the Node.JS Worker so we can reply to this MessageChannel
        (this.worker as Worker).postMessage({...input, transfer}, transfer);
      } else if (Database.isSharedWorkerSupported) {
        // Use the port object to send messages to the Shared Worker
        // the same way as for Web Worker
        (this.worker as SharedWorker).port.postMessage(input, transfer);
      } else {
        // Regular Web Worker communication
        (this.worker as Worker).postMessage(input, transfer);
      }
    });
  };
}
