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

import {isNodejs, isSharedWorkerSupported} from './Helper';
import {MessageQueue} from './MessageQueue';

declare const self: any;

if (isNodejs) {
  // Node.JS Worker
  const {isMainThread, parentPort} = __non_webpack_require__('worker_threads');
  if (isMainThread) {
    throw new Error('This script can only be running from within a Node.JS Worker');
  }
  (parentPort as any).on('message', (data: any) =>
    MessageQueue.add({
      data,
      ports: data.transfer,
    }),
  );
} else if (isSharedWorkerSupported) {
  // Shared Worker
  self.onconnect = (event: any) => (event.ports[0].onmessage = (event: any) => MessageQueue.add(event));
} else {
  // Web Worker / Polyfilled Web Worker
  self.addEventListener('message', (event: any) => MessageQueue.add(event));
}
