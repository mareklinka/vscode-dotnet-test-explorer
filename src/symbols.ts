import * as vscode from 'vscode';

export interface ITestSymbol {
  parentName: string;
  fullName: string;
  documentSymbol: vscode.DocumentSymbol;
}

export class Symbols {
  public static async getSymbols(uri: vscode.Uri): Promise<Array<ITestSymbol>> {
    return vscode.commands
      .executeCommand<Array<vscode.DocumentSymbol>>('vscode.executeDocumentSymbolProvider', uri)
      .then(symbols => {
        if (!symbols) {
          return [];
        }

        const flattenedSymbols = Symbols.flatten(symbols, '', false);

        flattenedSymbols.map(s => s.documentSymbol).forEach(s => (s.name = s.name.replace(/\(.*\)/g, '')));

        return flattenedSymbols;
      });
  }

  public static flatten(
    documentSymbols: Array<vscode.DocumentSymbol>,
    parent: string,
    isParentClass: boolean
  ): Array<ITestSymbol> {
    let flattened: Array<ITestSymbol> = [];
    documentSymbols.map((ds: vscode.DocumentSymbol) => {
      let nameForCurrentLevel: string;
      let nameForSymbol = ds.name;

      if (ds.kind === vscode.SymbolKind.Method) {
        nameForSymbol = nameForSymbol.replace(/\(.*\)/g, '');
      }

      if (ds.kind === vscode.SymbolKind.Class) {
        if (isParentClass) {
          nameForCurrentLevel = parent + '+' + nameForSymbol.substr(parent.length + 1);
        } else {
          nameForCurrentLevel = nameForSymbol;
        }
      } else {
        nameForCurrentLevel = parent ? `${parent}.${nameForSymbol}` : nameForSymbol;
      }

      flattened.push({ fullName: nameForCurrentLevel, parentName: parent, documentSymbol: ds });

      if (ds.children) {
        flattened = flattened.concat(
          Symbols.flatten(
            ds.children,
            nameForCurrentLevel,
            ds.kind === vscode.SymbolKind.Class
          )
        );
      }
    });

    return flattened;
  }
}
