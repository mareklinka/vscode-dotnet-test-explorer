import * as vscode from 'vscode';

export interface ITestSymbol {
  parentName: string;
  fullName: string;
  documentSymbol: vscode.DocumentSymbol;
}

export class Symbols {
  public static async getSymbols(uri, removeArgumentsFromMethods?: boolean): Promise<Array<ITestSymbol>> {
    return vscode.commands
      .executeCommand<Array<vscode.DocumentSymbol>>('vscode.executeDocumentSymbolProvider', uri)
      .then(symbols => {
        if (!symbols) {
          return [];
        }

        if (removeArgumentsFromMethods) {
          flattenedSymbols.map(s => s.documentSymbol).forEach(s => (s.name = s.name.replace(/\(.*\)/g, '')));
        }

        return flattenedSymbols.map(s => this.constructFqnForSymbol(s, flattenedSymbols));
      });
  }

  public static flatten(
    documentSymbols: Array<vscode.DocumentSymbol>,
    removeArgumentsFromMethods?: boolean,
    parent?: string
  ): Array<ITestSymbol> {
    let flattened: Array<ITestSymbol> = [];

    documentSymbols.map((ds: vscode.DocumentSymbol) => {
      if (ds.kind === vscode.SymbolKind.Class) {
        nameForCurrentLevel = nameForSymbol;
      } else {
        nameForCurrentLevel = parent ? `${parent}.${nameForSymbol}` : nameForSymbol;
      }

      flattened.push({ fullName: nameForCurrentLevel, parentName: parent, documentSymbol: ds });

      if (ds.children) {
        flattened = flattened.concat(Symbols.flatten(ds.children, removeArgumentsFromMethods, nameForCurrentLevel));
      }
    });
  }

  private static constructFqnForSymbol(symbol: ITestSymbol, documentSymbols: Array<ITestSymbol>): ITestSymbol {
    const isMethod = symbol.documentSymbol.kind === vscode.SymbolKind.Method;
    const parts = symbol.fullName.split('.');

    let rootNamespaceBuilder = '';
    let i = 0;

    do {
      rootNamespaceBuilder += rootNamespaceBuilder ? `.${parts[i]}` : parts[i];

      ++i;
    } while (!documentSymbols.find(s => s.fullName === rootNamespaceBuilder));

    let isParentClass =
      documentSymbols.find(s => s.fullName === rootNamespaceBuilder).documentSymbol.kind === vscode.SymbolKind.Class;
    let fqnBuilder = rootNamespaceBuilder;
    let builder = rootNamespaceBuilder;
    const methodName = parts[parts.length - 1];

    for (i; i < parts.length - (isMethod ? 1 : 0); ++i) {
      if (isParentClass) {
        fqnBuilder += `+${parts[i]}`;
      } else {
        fqnBuilder += `.${parts[i]}`;
      }

      builder += `.${parts[i]}`;

      const nextSymbol = documentSymbols.find(s => s.fullName === builder);

      isParentClass = nextSymbol && nextSymbol.documentSymbol.kind === vscode.SymbolKind.Class;
    }

    if (isMethod) {
      fqnBuilder += `.${methodName}`;
    }

    return {
      fullName: fqnBuilder,
      parentName: fqnBuilder.substr(0, fqnBuilder.lastIndexOf('.')),
      documentSymbol: symbol.documentSymbol
    };
  }
}
