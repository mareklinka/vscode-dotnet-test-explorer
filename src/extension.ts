"use strict";

import * as vscode from "vscode";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { FindTestInContext } from "./findTestInContext";
import { GotoTest } from "./gotoTest";
import { LeftClickTest } from "./leftClickTest";
import { Logger } from "./logger";
import { Problems } from "./problems";
import { StatusBar } from "./statusBar";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";

export function activate(context: vscode.ExtensionContext) {
    const testResults = new TestResultsFile();
    const testDirectories = new TestDirectories();
    const testCommands = new TestCommands(context, testResults, testDirectories);
    const gotoTest = new GotoTest();
    const problems = new Problems(testCommands);
    const statusBar = new StatusBar(testCommands);
    const leftClickTest = new LeftClickTest();
    const findTestInContext = new FindTestInContext();

    Logger.Log("Starting extension");

    testDirectories.parseTestDirectories();

    context.subscriptions.push(problems);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(testCommands);

    Utility.updateCache();

    const dotnetTestExplorer = new DotnetTestExplorer(context, testCommands, testResults, statusBar);
    const codeLensProvider = new TestStatusCodeLensProvider(testCommands);

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {

        if (e.affectsConfiguration("dotnet-test-explorer.testProjectPath")) {
            testDirectories.parseTestDirectories();
            testCommands.discoverTests();
        }

        if (e.affectsConfiguration("dotnet-test-explorer.showTestDuration")) {
            dotnetTestExplorer.redrawTestExplorer();
            codeLensProvider.redrawCodeLens();
        }

        Utility.updateCache();
    }));

    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);

    testCommands.discoverTests();

    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.showLog", () => {
        Logger.Show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.stop", () => {
        Executor.stop();
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        testDirectories.parseTestDirectories();
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        testCommands.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TestNode) => {
        testCommands.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.coverTest", (test: TestNode) => {
        testCommands.coverTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.debugTest", (test: TestNode) => {
        testCommands.debugTestByName(test.fqn, !test.isFolder);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.rerunLastCommand", (test: TestNode) => {
        testCommands.rerunLastCommand();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.leftClickTest", (test: TestNode) => {
        leftClickTest.handle(test);
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.openPanel", () => {
        vscode.commands.executeCommand("workbench.view.extension.test");
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.runTestInContext", (editor: vscode.TextEditor) => {
        findTestInContext.find(editor.document, editor.selection.start).then((testRunContext) => {
            testCommands.runTestByName(testRunContext.testName, testRunContext.isSingleTest);
        });
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.debugTestInContext", (editor: vscode.TextEditor) => {
        findTestInContext.find(editor.document, editor.selection.start).then((testRunContext) => {
            testCommands.debugTestByName(testRunContext.testName, testRunContext.isSingleTest);
        });
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.coverTestInContext", (editor: vscode.TextEditor) => {
        findTestInContext.find(editor.document, editor.selection.start).then((testRunContext) => {
            testCommands.coverTestByName(testRunContext.testName, testRunContext.isSingleTest);
        });
    }));
}

export function deactivate() {
}
