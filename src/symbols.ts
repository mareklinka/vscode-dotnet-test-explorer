import * as vscode from "vscode";

export interface ITestSymbol {
    parentName: string;
    fullName: string;
    documentSymbol: vscode.DocumentSymbol;
}

export class Symbols {
    public static async getSymbols(uri, removeArgumentsFromMethods?: boolean): Promise<ITestSymbol[]> {
        return vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", uri)

            .then((symbols) => {

                if (!symbols) {
                    return [];
                }

                const flattenedSymbols = Symbols.flatten(symbols, removeArgumentsFromMethods);

                if (removeArgumentsFromMethods) {
                    flattenedSymbols.map( (s) => s.documentSymbol).forEach( (s) => s.name = s.name.replace(/\(.*\)/g, ""));
                }

                return flattenedSymbols.map((s) => this.constructFqnForSymbol(s, flattenedSymbols));
            });
    }

    public static flatten(documentSymbols: vscode.DocumentSymbol[], removeArgumentsFromMethods?: boolean, parent?: string): ITestSymbol[] {

        let flattened: ITestSymbol[] = [];

        documentSymbols.map( (ds: vscode.DocumentSymbol) => {

            let nameForCurrentLevel: string;

            let nameForSymbol = ds.name;

            if (ds.kind === vscode.SymbolKind.Method && removeArgumentsFromMethods) {
                nameForSymbol = nameForSymbol.replace(/\(.*\)/g, "");
            }

            if (ds.kind === vscode.SymbolKind.Class) {
                nameForCurrentLevel = nameForSymbol;
            } else {
                nameForCurrentLevel = parent ? `${parent}.${nameForSymbol}` : nameForSymbol;
            }

            flattened.push({fullName: nameForCurrentLevel, parentName: parent, documentSymbol: ds});

            if (ds.children) {
                flattened = flattened.concat(Symbols.flatten(ds.children, removeArgumentsFromMethods, nameForCurrentLevel));
            }
        });

        return flattened;
    }

    private static constructFqnForSymbol(symbol: ITestSymbol, documentSymbols: ITestSymbol[]): ITestSymbol {
        const isMethod = symbol.documentSymbol.kind === vscode.SymbolKind.Method;
        const parts = symbol.fullName.split(".");

        let isParentClass = documentSymbols.find((s) => s.fullName === parts[0]).documentSymbol.kind === vscode.SymbolKind.Class;
        let fqnBuilder = parts[0];
        let builder = parts[0];
        const methodName = parts[parts.length - 1];

        for (let i = 1; i < parts.length - (isMethod ? 1 : 0); ++i) {
            if (isParentClass) {
                fqnBuilder += `+${parts[i]}`;
            } else {
                fqnBuilder += `.${parts[i]}`;
            }

            builder += `.${parts[i]}`;

            const nextSymbol = documentSymbols.find((s) => s.fullName === builder);

            isParentClass = nextSymbol && nextSymbol.documentSymbol.kind === vscode.SymbolKind.Class;
        }

        if (isMethod) {
            fqnBuilder += `.${methodName}`;
        }

        return {fullName: fqnBuilder, parentName: fqnBuilder.substr(0, fqnBuilder.lastIndexOf(".")), documentSymbol: symbol.documentSymbol};
    }
}
