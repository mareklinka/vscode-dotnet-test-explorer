import * as vscode from 'vscode';
import { Logger } from './logger';
import { Symbols } from './symbols';
import { TestNode } from './testNode';

export class GotoTest {
  public async go(test: TestNode): Promise<void> {
    const symbols = (
      await vscode.commands.executeCommand<Array<vscode.SymbolInformation>>(
        'vscode.executeWorkspaceSymbolProvider',
        test.fqn.substr(test.fqn.lastIndexOf('.') + 1)
      )
    );

    if (!symbols) {
      vscode.window.showWarningMessage('Unable to navigate to the selected test - no symbol information available');
      return;
    }

    try {
      const symbol = await this.findTestLocation(symbols.filter(s => s.kind === vscode.SymbolKind.Method), test);

      vscode.workspace.openTextDocument(symbol.uri).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
          const selection = new vscode.Selection(
            symbol.range.start.line,
            symbol.range.start.character,
            symbol.range.start.line,
            symbol.range.end.character
          );

          if (vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.selection = selection;
            vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
          }
        });
      });
    } catch (r) {
      Logger.Log(r.message);
      vscode.window.showWarningMessage(r.message);
    }
  }

  public async findTestLocation(
    symbols: Array<vscode.SymbolInformation>,
    testNode: TestNode
  ): Promise<ITestSymbolLocation> {
    const candidates: Map<string, ITestSymbolLocation> = new Map<string, ITestSymbolLocation>();

    for (let i = 0; i < symbols.length; ++i) {
      const docSymbols = await Symbols.getSymbols(symbols[i].location.uri, true);

      const candidate = docSymbols.find(ts => this.isSymbolATestCandidate(symbols[i]) && ts.fullName === testNode.fqn);

      if (candidate) {
        // path@(startline:startchar-endline:endchar)
        const key =
          `${symbols[i].location.uri.fsPath}@` +
          `(${candidate.documentSymbol.range.start.line},${candidate.documentSymbol.range.start.character}-` +
          `${candidate.documentSymbol.range.end.line}:${candidate.documentSymbol.range.end.character})`;

        candidates.set(key, { range: candidate.documentSymbol.range, uri: symbols[i].location.uri });
      }
    }

    if (candidates.size === 0) {
      throw new Error('Could not find test (no symbols found)');
    } else if (candidates.size === 1) {
      // tslint:disable-next-line: no-non-null-assertion
      return candidates.get(candidates.keys().next().value)!;
    } else {
      throw new Error('Could not find test (multiple candidates found)');
    }
  }

  private isSymbolATestCandidate(s: vscode.SymbolInformation): boolean {
    return s.location.uri.toString().endsWith('.fs')
      ? s.kind === vscode.SymbolKind.Variable
      : s.kind === vscode.SymbolKind.Method;
  }
}

interface ITestSymbolLocation {
  range: vscode.Range;
  uri: vscode.Uri;
}
