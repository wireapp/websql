import { MessageQueue } from "./MessageQueue";
import { isSharedWorkerSupported, isNodejs } from "./Helper";

declare const self: any;

if (isNodejs) {
  // Node.JS Worker
  const { isMainThread, parentPort } = __non_webpack_require__(
    "worker_threads"
  );
  if (isMainThread) {
    throw new Error(
      "This script can only be running from within a Node.JS Worker"
    );
  }
  (parentPort as any).on("message", data =>
    MessageQueue.add({
      data,
      ports: data.transfer
    })
  );
} else if (isSharedWorkerSupported) {
  // Shared Worker
  self.onconnect = event =>
    (event.ports[0].onmessage = event => MessageQueue.add(event));
} else {
  // Web Worker / Polyfilled Web Worker
  self.addEventListener("message", event => MessageQueue.add(event));
}
