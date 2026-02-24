import { getEncoding } from "js-tiktoken";
import { parentPort } from "node:worker_threads";

import {
  TOKENIZE_ERROR_TYPE,
  TOKENIZE_REQUEST_TYPE,
  TOKENIZE_RESULT_TYPE,
  isWorkerRequestMessage,
  type WorkerResponseMessage,
} from "./types";

const encoder = getEncoding("cl100k_base");

if (parentPort === null) {
  throw new Error("Token worker must be started with worker_threads.");
}

const port = parentPort;

port.on("message", (message: unknown) => {
  if (!isWorkerRequestMessage(message) || message.type !== TOKENIZE_REQUEST_TYPE) {
    return;
  }

  try {
    const tokenCount = encoder.encode(message.text).length;
    const response: WorkerResponseMessage = {
      type: TOKENIZE_RESULT_TYPE,
      requestId: message.requestId,
      tokenCount,
    };

    port.postMessage(response);
  } catch (error: unknown) {
    const response: WorkerResponseMessage = {
      type: TOKENIZE_ERROR_TYPE,
      requestId: message.requestId,
      error:
        error instanceof Error
          ? error.message
          : "Unknown tokenization error.",
    };

    port.postMessage(response);
  }
});
