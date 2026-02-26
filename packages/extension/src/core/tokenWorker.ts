import { getEncoding } from "js-tiktoken";
import { parentPort } from "node:worker_threads";

import {
  type HeavyRange,
  TOKENIZE_ERROR_TYPE,
  TOKENIZE_REQUEST_TYPE,
  TOKENIZE_RESULT_TYPE,
  isWorkerRequestMessage,
  type WorkerResponseMessage,
} from "./types";

const FULL_RECONCILE_CHAR_THRESHOLD = 50_000;
const CHUNK_LINE_SIZE = 500;
const WARNING_TOKENS_THRESHOLD = 150;
const CRITICAL_TOKENS_THRESHOLD = 400;

function hashDjb2(input: string): number {
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return hash >>> 0;
}

function splitIntoLineChunks(text: string, linesPerChunk: number): string[] {
  const lines = text.split(/\r?\n/u);
  const chunks: string[] = [];

  for (let index = 0; index < lines.length; index += linesPerChunk) {
    chunks.push(lines.slice(index, index + linesPerChunk).join("\n"));
  }

  return chunks;
}

function scanHeavyRanges(text: string): HeavyRange[] {
  const lines = text.split("\n");
  const heavyRanges: HeavyRange[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index].trim();

    // Skip empty lines to avoid unnecessary tokenization work.
    if (lineText.length === 0) {
      continue;
    }

    const lineTokens = encoder.encode(lineText).length;

    if (lineTokens >= CRITICAL_TOKENS_THRESHOLD) {
      heavyRanges.push({
        startLine: index,
        endLine: index,
        tokens: lineTokens,
        severity: "critical",
      });
      continue;
    }

    if (lineTokens >= WARNING_TOKENS_THRESHOLD) {
      heavyRanges.push({
        startLine: index,
        endLine: index,
        tokens: lineTokens,
        severity: "warning",
      });
    }
  }

  return heavyRanges;
}

const encoder = getEncoding("cl100k_base");
const chunkCache = new Map<number, number>();

if (parentPort === null) {
  throw new Error("Token worker must be started with worker_threads.");
}

const port = parentPort;

port.on("message", (message: unknown) => {
  if (!isWorkerRequestMessage(message) || message.type !== TOKENIZE_REQUEST_TYPE) {
    return;
  }

  try {
    let tokenCount = 0;
    let isReconciled = false;
    let topHeavyRanges: HeavyRange[] | undefined;

    if (
      message.isReconcileRequest ||
      message.text.length < FULL_RECONCILE_CHAR_THRESHOLD
    ) {
      tokenCount = encoder.encode(message.text).length;
      isReconciled = true;
      chunkCache.clear();

      if (message.isReconcileRequest) {
        topHeavyRanges = scanHeavyRanges(message.text);
      }
    } else {
      const chunks = splitIntoLineChunks(message.text, CHUNK_LINE_SIZE);

      for (const chunk of chunks) {
        const chunkHash = hashDjb2(chunk);
        const cachedTokenCount = chunkCache.get(chunkHash);

        if (cachedTokenCount !== undefined) {
          tokenCount += cachedTokenCount;
          continue;
        }

        const computedTokenCount = encoder.encode(chunk).length;
        chunkCache.set(chunkHash, computedTokenCount);
        tokenCount += computedTokenCount;
      }
    }

    const response: WorkerResponseMessage = {
      type: TOKENIZE_RESULT_TYPE,
      requestId: message.requestId,
      tokenCount,
      isReconciled,
      isEstimate: false,
      topHeavyRanges,
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
