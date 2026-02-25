import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";

import {
  TOKENIZE_REQUEST_TYPE,
  TOKENIZE_RESULT_TYPE,
  isWorkerResponseMessage,
  type WorkerRequestMessage,
} from "./types";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

interface PendingRequest {
  readonly resolve: (tokenCount: number) => void;
  readonly reject: (error: Error) => void;
  readonly timeoutHandle: NodeJS.Timeout;
}

export interface TokenEngineOptions {
  readonly requestTimeoutMs?: number;
  readonly workerScriptPath?: string;
}

export class TokenEngine {
  private readonly worker: Worker;
  private readonly requestTimeoutMs: number;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private isDisposed = false;

  public constructor(options: TokenEngineOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const workerScriptPath =
      options.workerScriptPath ?? resolve(__dirname, "tokenWorker.js");

    this.worker = new Worker(workerScriptPath);
    this.worker.on("message", (message: unknown) => this.handleWorkerMessage(message));
    this.worker.on("error", (error: Error) => this.rejectAll(error));
    this.worker.on("exit", (code: number) => {
      if (!this.isDisposed && code !== 0) {
        this.rejectAll(new Error(`Token worker exited unexpectedly with code ${code}.`));
      }
    });
  }

  public getFastEstimate(text: string): number {
    return Math.ceil(text.length / 4);
  }

  public calculateTokens(
    text: string,
    isReconcileRequest: boolean = false,
  ): Promise<number> {
    if (this.isDisposed) {
      return Promise.reject(new Error("TokenEngine is disposed."));
    }

    const requestId = randomUUID();
    const requestMessage: WorkerRequestMessage = {
      type: TOKENIZE_REQUEST_TYPE,
      requestId,
      text,
      isReconcileRequest,
    };

    return new Promise<number>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(
          new Error(
            `Token calculation timed out after ${this.requestTimeoutMs}ms for request ${requestId}.`,
          ),
        );
      }, this.requestTimeoutMs);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutHandle,
      });

      try {
        this.worker.postMessage(requestMessage);
      } catch (error: unknown) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        reject(this.toError(error, "Failed to post message to token worker."));
      }
    });
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    this.rejectAll(new Error("TokenEngine was disposed before request completion."));
    void this.worker.terminate();
  }

  private handleWorkerMessage(message: unknown): void {
    if (!isWorkerResponseMessage(message)) {
      return;
    }

    const pending = this.pendingRequests.get(message.requestId);
    if (pending === undefined) {
      return;
    }

    clearTimeout(pending.timeoutHandle);
    this.pendingRequests.delete(message.requestId);

    if (message.type === TOKENIZE_RESULT_TYPE) {
      pending.resolve(message.tokenCount);
      return;
    }

    pending.reject(new Error(message.error));
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(error);
    }

    this.pendingRequests.clear();
  }

  private toError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(fallbackMessage);
  }
}
