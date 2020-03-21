import * as vscode from 'vscode';
import { ITestSymbol, Symbols } from './symbols';
import { ITestRunContext } from './testCommands';

export class FindTestInContext {
  public async find(doc: vscode.TextDocument, position: vscode.Position): Promise<ITestRunContext | undefined> {
    return Symbols.getSymbols(doc.uri, true).then((documentSymbols: Array<ITestSymbol>) => {
      const symbolsInRange = documentSymbols.filter(ds => ds.documentSymbol.range.contains(position));

      let symbolCandidate: ITestSymbol | undefined;

      symbolCandidate = symbolsInRange.find(s => s.documentSymbol.kind === vscode.SymbolKind.Method);

      if (symbolCandidate) {
        return { testName: symbolCandidate.fullName, isSingleTest: true, collectCoverage: false };
      }

      symbolCandidate = symbolsInRange.find(s => s.documentSymbol.kind === vscode.SymbolKind.Class);

            if (symbolCandidate) {
                return {testName: symbolCandidate.fullName, isSingleTest: true, collectCoverage: false};
            }

            symbolCandidate = symbolsInRange.reverse().find( (s) => s.documentSymbol.kind === vscode.SymbolKind.Class);

            if (symbolCandidate) {
                return {testName: symbolCandidate.fullName, isSingleTest: false, collectCoverage: false};
            }
        });
    }
}
