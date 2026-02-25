import * as vscode from "vscode";

import { type HeavyRange } from "../core/types";

export class DecorationsManager implements vscode.Disposable {
  private readonly warningDecoration: vscode.TextEditorDecorationType;
  private readonly criticalDecoration: vscode.TextEditorDecorationType;

  public constructor() {
    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      overviewRulerColor: "#ff9900",
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      backgroundColor: "rgba(255, 153, 0, 0.15)",
      isWholeLine: true,
    });

    this.criticalDecoration = vscode.window.createTextEditorDecorationType({
      overviewRulerColor: "#ff0000",
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      backgroundColor: "rgba(255, 0, 0, 0.15)",
      isWholeLine: true,
    });
  }

  public updateDecorations(
    editor: vscode.TextEditor | undefined,
    ranges: HeavyRange[] | undefined,
  ): void {
    if (editor === undefined) {
      return;
    }

    if (ranges === undefined || ranges.length === 0) {
      editor.setDecorations(this.warningDecoration, []);
      editor.setDecorations(this.criticalDecoration, []);
      return;
    }

    const warningRanges: vscode.Range[] = [];
    const criticalRanges: vscode.Range[] = [];
    const maxLineIndex = Math.max(0, editor.document.lineCount - 1);

    for (const heavyRange of ranges) {
      const startLine = Math.max(0, Math.min(heavyRange.startLine, maxLineIndex));
      const endLine = Math.max(
        startLine,
        Math.min(heavyRange.endLine, maxLineIndex),
      );
      const endPosition = editor.document.lineAt(endLine).range.end;
      const range = new vscode.Range(startLine, 0, endLine, endPosition.character);

      if (heavyRange.severity === "critical") {
        criticalRanges.push(range);
      } else {
        warningRanges.push(range);
      }
    }

    editor.setDecorations(this.warningDecoration, warningRanges);
    editor.setDecorations(this.criticalDecoration, criticalRanges);
  }

  public dispose(): void {
    this.warningDecoration.dispose();
    this.criticalDecoration.dispose();
  }
}
