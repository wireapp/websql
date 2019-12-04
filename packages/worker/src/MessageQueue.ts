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

let MessageHandler: any;

const isRuntimeInitialized = (() =>
  new Promise(
    resolve =>
      (Module['onRuntimeInitialized'] = async () => {
        MessageHandler = (await import('./MessageHandler')).default;
        resolve();
      }),
  ))();

export class MessageQueue {
  private static processing: boolean = false;
  private static readonly queue: any[] = [];

  public static async add(event: any): Promise<void> {
    if (!this.processing) {
      // Ensure the runtime is available
      await isRuntimeInitialized;

      // Not currently processing anything so just process the event
      await this.process(event);
    } else {
      this.queue.push(event);
    }
  }

  private static async process(event: any): Promise<void> {
    this.processing = true;
    await MessageHandler.onMessageReceived(event);
    if (this.queue.length !== 0) {
      // Pull out the oldest message and process it
      const nextEvent = this.queue.shift();
      if (nextEvent) {
        await this.process(nextEvent);
      }
    }
    this.processing = false;
  }
}
