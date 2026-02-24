import * as vscode from "vscode";

import { TokenEngine } from "./core/TokenEngine";
import { StatusBarManager } from "./ui/StatusBarManager";

let tokenEngine: TokenEngine | undefined;
let statusBarManager: StatusBarManager | undefined;
let textChangeDebounceHandle: NodeJS.Timeout | undefined;
let lastUpdateRequestId = 0;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  tokenEngine = new TokenEngine();
  statusBarManager = new StatusBarManager();

  const updateStatusBarFromActiveEditor = async (): Promise<void> => {
    if (tokenEngine === undefined || statusBarManager === undefined) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      statusBarManager.update(0, true);
      return;
    }

    const updateRequestId = ++lastUpdateRequestId;

    try {
      const tokenCount = await tokenEngine.calculateTokens(editor.document.getText());

      // Drop stale responses from older async requests.
      if (updateRequestId !== lastUpdateRequestId) {
        return;
      }

      statusBarManager.update(tokenCount, true);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown token calculation error.";
      console.error(`[token-burner-alert] Failed to update status bar: ${errorMessage}`);
    }
  };

  const scheduleDebouncedUpdate = (): void => {
    if (textChangeDebounceHandle !== undefined) {
      clearTimeout(textChangeDebounceHandle);
    }

    textChangeDebounceHandle = setTimeout(() => {
      void updateStatusBarFromActiveEditor();
    }, 300);
  };

  context.subscriptions.push({
    dispose: () => {
      if (textChangeDebounceHandle !== undefined) {
        clearTimeout(textChangeDebounceHandle);
        textChangeDebounceHandle = undefined;
      }

      statusBarManager?.dispose();
      statusBarManager = undefined;
      tokenEngine?.dispose();
      tokenEngine = undefined;
    },
  });

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      void updateStatusBarFromActiveEditor();
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

      scheduleDebouncedUpdate();
    }),
  );

  context.subscriptions.push(statusBarManager);

  try {
    await tokenEngine.calculateTokens("");
    await updateStatusBarFromActiveEditor();
    console.log("[token-burner-alert] TokenEngine initialized.");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown initialization error.";

    void vscode.window.showErrorMessage(
      `token-burner-alert failed to initialize: ${errorMessage}`,
    );

    if (textChangeDebounceHandle !== undefined) {
      clearTimeout(textChangeDebounceHandle);
      textChangeDebounceHandle = undefined;
    }

    statusBarManager.dispose();
    statusBarManager = undefined;
    tokenEngine.dispose();
    tokenEngine = undefined;
  }
}

export function deactivate(): void {
  if (textChangeDebounceHandle !== undefined) {
    clearTimeout(textChangeDebounceHandle);
    textChangeDebounceHandle = undefined;
  }

  statusBarManager?.dispose();
  statusBarManager = undefined;
  tokenEngine?.dispose();
  tokenEngine = undefined;
}
