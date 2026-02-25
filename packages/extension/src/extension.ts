import * as vscode from "vscode";

import { TokenEngine } from "./core/TokenEngine";
import { StatusBarManager } from "./ui/StatusBarManager";

let tokenEngine: TokenEngine | undefined;
let statusBarManager: StatusBarManager | undefined;
let chunkedUpdateDebounceHandle: NodeJS.Timeout | undefined;
let reconcileUpdateDebounceHandle: NodeJS.Timeout | undefined;
let latestUpdateSequence = 0;

function clearPendingUpdateHandles(): void {
  if (chunkedUpdateDebounceHandle !== undefined) {
    clearTimeout(chunkedUpdateDebounceHandle);
    chunkedUpdateDebounceHandle = undefined;
  }

  if (reconcileUpdateDebounceHandle !== undefined) {
    clearTimeout(reconcileUpdateDebounceHandle);
    reconcileUpdateDebounceHandle = undefined;
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  tokenEngine = new TokenEngine();
  statusBarManager = new StatusBarManager();

  const scheduleThreeTierUpdate = (text: string): void => {
    if (tokenEngine === undefined || statusBarManager === undefined) {
      return;
    }

    const updateSequence = ++latestUpdateSequence;

    // Tier 1: Instant main-thread estimate for immediate UI feedback.
    statusBarManager.update(tokenEngine.getFastEstimate(text), false);

    clearPendingUpdateHandles();

    // Tier 2: Debounced worker chunk-cache pass.
    chunkedUpdateDebounceHandle = setTimeout(() => {
      void (async () => {
        if (tokenEngine === undefined || statusBarManager === undefined) {
          return;
        }

        try {
          const tokenCount = await tokenEngine.calculateTokens(text, false);

          if (updateSequence !== latestUpdateSequence) {
            return;
          }

          statusBarManager.update(tokenCount, false);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown token calculation error.";
          console.error(
            `[token-burner-alert] Failed chunked token update: ${errorMessage}`,
          );
        }
      })();
    }, 300);

    // Tier 3: Full reconcile pass for exact final count.
    reconcileUpdateDebounceHandle = setTimeout(() => {
      void (async () => {
        if (tokenEngine === undefined || statusBarManager === undefined) {
          return;
        }

        try {
          const tokenCount = await tokenEngine.calculateTokens(text, true);

          if (updateSequence !== latestUpdateSequence) {
            return;
          }

          statusBarManager.update(tokenCount, true);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown token calculation error.";
          console.error(
            `[token-burner-alert] Failed reconcile token update: ${errorMessage}`,
          );
        }
      })();
    }, 2_000);
  };

  const updateFromActiveEditor = (): void => {
    if (statusBarManager === undefined) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      clearPendingUpdateHandles();
      latestUpdateSequence += 1;
      statusBarManager.update(0, true);
      return;
    }

    scheduleThreeTierUpdate(editor.document.getText());
  };

  context.subscriptions.push({
    dispose: () => {
      clearPendingUpdateHandles();
      statusBarManager?.dispose();
      statusBarManager = undefined;
      tokenEngine?.dispose();
      tokenEngine = undefined;
    },
  });

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateFromActiveEditor();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor === undefined) {
        return;
      }

      if (event.document.uri.toString() !== activeEditor.document.uri.toString()) {
        return;
      }

      scheduleThreeTierUpdate(event.document.getText());
    }),
  );

  context.subscriptions.push(statusBarManager);

  try {
    await tokenEngine.calculateTokens("", true);
    updateFromActiveEditor();
    console.log("[token-burner-alert] TokenEngine initialized.");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown initialization error.";

    void vscode.window.showErrorMessage(
      `token-burner-alert failed to initialize: ${errorMessage}`,
    );

    clearPendingUpdateHandles();
    statusBarManager.dispose();
    statusBarManager = undefined;
    tokenEngine.dispose();
    tokenEngine = undefined;
  }
}

export function deactivate(): void {
  clearPendingUpdateHandles();
  statusBarManager?.dispose();
  statusBarManager = undefined;
  tokenEngine?.dispose();
  tokenEngine = undefined;
}
