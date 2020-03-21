import * as vscode from "vscode";
import { Logger } from "./logger";
import { Symbols } from "./symbols";
import { TestNode } from "./testNode";

export class GotoTest {

    public async go(test: TestNode): Promise<void> {
        const symbols = (await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            test.fqn.substr(test.fqn.lastIndexOf(".") + 1))).filter((s) => s.kind === vscode.SymbolKind.Method);

        try {
            const symbol = await this.findTestLocation(symbols, test);

            vscode.workspace.openTextDocument(symbol.uri).then((doc) => {
                vscode.window.showTextDocument(doc).then((editor) => {
                    const selection = new vscode.Selection(symbol.range.start.line, symbol.range.start.character, symbol.range.start.line, symbol.range.end.character);
                    vscode.window.activeTextEditor.selection = selection;
                    vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
                });
            });

        } catch (r) {
            Logger.Log(r.message);
            vscode.window.showWarningMessage(r.message);
        }
    }

    public async findTestLocation(symbols: vscode.SymbolInformation[], testNode: TestNode): Promise<ITestSymbolLocation> {
        for (let i = 0; i < symbols.length; ++i) {
            const docSymbols = await Symbols.getSymbols(symbols[i].location.uri, true);

            const candidate = docSymbols.find((ts) => this.isSymbolATestCandidate(symbols[i]) && ts.fullName === testNode.fqn);

            if (candidate) {
                return { range: candidate.documentSymbol.range, uri: symbols[i].location.uri};
            }
        }

        throw new Error("Could not find test (no symbols found)");
    }

    private isSymbolATestCandidate(s: vscode.SymbolInformation): boolean {
        return s.location.uri.toString().endsWith(".fs") ? s.kind === vscode.SymbolKind.Variable : s.kind === vscode.SymbolKind.Method;
    }
}

interface ITestSymbolLocation {
    range: vscode.Range;
    uri: vscode.Uri;
}
