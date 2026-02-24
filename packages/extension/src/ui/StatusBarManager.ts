import * as vscode from "vscode";

const WARNING_THRESHOLD = 4_000;
const CRITICAL_THRESHOLD = 8_000;

export class StatusBarManager implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;

  public constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000,
    );
    this.statusBarItem.name = "Token Burner Alert";
    this.statusBarItem.show();
  }

  public update(tokenCount: number, isReconciled: boolean): void {
    const normalizedTokenCount = Number.isFinite(tokenCount)
      ? Math.max(0, tokenCount)
      : 0;
    const prefix = isReconciled ? "" : "~";
    const formattedCount = `${prefix}${this.formatTokenCount(normalizedTokenCount)}`;

    if (normalizedTokenCount >= CRITICAL_THRESHOLD) {
      this.statusBarItem.text = `$(error) ${formattedCount} tok`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      return;
    }

    if (normalizedTokenCount >= WARNING_THRESHOLD) {
      this.statusBarItem.text = `$(warning) ${formattedCount} tok`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
      return;
    }

    this.statusBarItem.text = `$(symbol-string) ${formattedCount} tok`;
    this.statusBarItem.backgroundColor = undefined;
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }

  private formatTokenCount(tokenCount: number): string {
    if (tokenCount < 1_000) {
      return tokenCount.toLocaleString("en-US");
    }

    if (tokenCount < 1_000_000) {
      return this.formatCompact(tokenCount / 1_000, "k");
    }

    if (tokenCount < 1_000_000_000) {
      return this.formatCompact(tokenCount / 1_000_000, "m");
    }

    return this.formatCompact(tokenCount / 1_000_000_000, "b");
  }

  private formatCompact(value: number, suffix: "k" | "m" | "b"): string {
    const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    const rounded = value.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
    return `${rounded}${suffix}`;
  }
}
