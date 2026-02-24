export const TOKENIZE_REQUEST_TYPE = "tokenize" as const;
export const TOKENIZE_RESULT_TYPE = "tokenize:result" as const;
export const TOKENIZE_ERROR_TYPE = "tokenize:error" as const;

export interface TokenizeRequestMessage {
  readonly type: typeof TOKENIZE_REQUEST_TYPE;
  readonly requestId: string;
  readonly text: string;
}

export interface TokenizeResultMessage {
  readonly type: typeof TOKENIZE_RESULT_TYPE;
  readonly requestId: string;
  readonly tokenCount: number;
}

export interface TokenizeErrorMessage {
  readonly type: typeof TOKENIZE_ERROR_TYPE;
  readonly requestId: string;
  readonly error: string;
}

export type WorkerRequestMessage = TokenizeRequestMessage;
export type WorkerResponseMessage = TokenizeResultMessage | TokenizeErrorMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringField(
  value: Record<string, unknown>,
  key: string,
): value is Record<string, string> {
  return typeof value[key] === "string";
}

export function isWorkerRequestMessage(
  value: unknown,
): value is WorkerRequestMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === TOKENIZE_REQUEST_TYPE &&
    hasStringField(value, "requestId") &&
    hasStringField(value, "text")
  );
}

export function isWorkerResponseMessage(
  value: unknown,
): value is WorkerResponseMessage {
  if (!isRecord(value) || !hasStringField(value, "requestId")) {
    return false;
  }

  if (value.type === TOKENIZE_RESULT_TYPE) {
    return typeof value.tokenCount === "number";
  }

  if (value.type === TOKENIZE_ERROR_TYPE) {
    return hasStringField(value, "error");
  }

  return false;
}
