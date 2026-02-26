export const TOKENIZE_REQUEST_TYPE = "tokenize" as const;
export const TOKENIZE_RESULT_TYPE = "tokenize:result" as const;
export const TOKENIZE_ERROR_TYPE = "tokenize:error" as const;

export interface HeavyRange {
  startLine: number;
  endLine: number;
  tokens: number;
  severity: "warning" | "critical";
}

export interface TokenizeRequestMessage {
  readonly type: typeof TOKENIZE_REQUEST_TYPE;
  readonly requestId: string;
  readonly text: string;
  readonly isReconcileRequest: boolean;
}

export interface TokenizeResultMessage {
  readonly type: typeof TOKENIZE_RESULT_TYPE;
  readonly requestId: string;
  readonly tokenCount: number;
  readonly isReconciled: boolean;
  readonly isEstimate: boolean;
  readonly topHeavyRanges?: HeavyRange[];
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

function hasBooleanField(
  value: Record<string, unknown>,
  key: string,
): value is Record<string, boolean> {
  return typeof value[key] === "boolean";
}

function isHeavyRange(value: unknown): value is HeavyRange {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.startLine === "number" &&
    typeof value.endLine === "number" &&
    typeof value.tokens === "number" &&
    (value.severity === "warning" || value.severity === "critical")
  );
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
    hasStringField(value, "text") &&
    hasBooleanField(value, "isReconcileRequest")
  );
}

export function isWorkerResponseMessage(
  value: unknown,
): value is WorkerResponseMessage {
  if (!isRecord(value) || !hasStringField(value, "requestId")) {
    return false;
  }

  if (value.type === TOKENIZE_RESULT_TYPE) {
    const hasRequiredFields =
      typeof value.tokenCount === "number" &&
      typeof value.isReconciled === "boolean" &&
      typeof value.isEstimate === "boolean";

    if (!hasRequiredFields) {
      return false;
    }

    if (value.topHeavyRanges === undefined) {
      return true;
    }

    return Array.isArray(value.topHeavyRanges) && value.topHeavyRanges.every(isHeavyRange);
  }

  if (value.type === TOKENIZE_ERROR_TYPE) {
    return hasStringField(value, "error");
  }

  return false;
}
