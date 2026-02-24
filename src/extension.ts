import * as vscode from "vscode";

import { TokenEngine } from "./core/TokenEngine";

let tokenEngine: TokenEngine | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  tokenEngine = new TokenEngine();

  context.subscriptions.push({
    dispose: () => {
      tokenEngine?.dispose();
      tokenEngine = undefined;
    },
  });

  try {
    await tokenEngine.calculateTokens("");
    console.log("[token-burner-alert] TokenEngine initialized.");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown initialization error.";

    void vscode.window.showErrorMessage(
      `token-burner-alert failed to initialize: ${errorMessage}`,
    );

    tokenEngine.dispose();
    tokenEngine = undefined;
  }
}

export function deactivate(): void {
  tokenEngine?.dispose();
  tokenEngine = undefined;
}
