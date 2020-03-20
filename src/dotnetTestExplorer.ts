import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem } from "vscode";
import { Logger } from "./logger";
import { StatusBar } from "./statusBar";
import { ITestRunContext, TestCommands } from "./testCommands";
import { IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { ITestResult, TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export interface ITreeNode {
    tests: string[];
    nodes: Map<string, ITreeNode>;
    isNested: boolean;
}

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {

    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private discoveredTests: string[];
    private testResults: TestResult[];
    private allNodes: TestNode[] = [];

    constructor(private context: vscode.ExtensionContext, private testCommands: TestCommands, private resultsFile: TestResultsFile, private statusBar: StatusBar) {
        testCommands.onTestDiscoveryFinished(this.updateWithDiscoveredTests, this);
        testCommands.onTestDiscoveryStarted(this.updateWithDiscoveringTest, this);
        testCommands.onTestRun(this.updateTreeWithRunningTests, this);
        testCommands.onNewTestResults(this.addTestResults, this);
    }

    /**
     * @description
     * Refreshes the test explorer pane by running the
     * `dotnet test` command and requesting information about
     * discovered tests.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public refreshTestExplorer(): void {
        this.testCommands.discoverTests();
    }

    public redrawTestExplorer(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: TestNode): TreeItem {
        if (element.isError) {
            return new TreeItem(element.name);
        }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? Utility.defaultCollapsibleState : void 0,
            iconPath: element.icon ? {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", element.icon)),
                light: this.context.asAbsolutePath(path.join("resources", "light", element.icon)),
            } : void 0,
            contextValue: element.isFolder ? "folder" : "test",
            command: element.isFolder ? null : {
                command: "dotnet-test-explorer.leftClickTest",
                title: "",
                arguments: [element],
            },
        };
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {

        if (element) {
            return element.children;
        }

        if (!this.discoveredTests) {
            const loadingNode = new TestNode("", "Discovering tests", undefined, this.testResults);
            loadingNode.setAsLoading();
            return [loadingNode];
        }

        if (this.discoveredTests.length === 0) {
            return ["Please open or set the test project", "and ensure your project compiles."].map((e) => {
                const node = new TestNode("", e, undefined, this.testResults);
                node.setAsError(e);
                return node;
            });
        }

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        if (!useTreeView) {
            return this.discoveredTests.map((name) => {
                return new TestNode(`${name}`, name, undefined, this.testResults);
            });
        }

        const structuredTests: ITreeNode = { tests: [], nodes: new Map<string, ITreeNode>(), isNested: false };

        this.allNodes = [];

        this.discoveredTests.forEach((name: string) => {
            try {
                // Split name on all dots that are not inside parenthesis MyNamespace.MyClass.MyMethod(value: "My.Dot") -> MyNamespace, MyClass, MyMethod(value: "My.Dot")
                this.addToObject(structuredTests, name.split(/\.(?![^\(]*\))/g));
            } catch (err) {
                Logger.LogError(`Failed to add test with name ${name}`, err);
            }
        });

        const root = this.createTestNode("", structuredTests);

        return root;
    }

    private addToObject(container: ITreeNode, parts: string[]): void {
        const title = parts.splice(0, 1)[0];

        if (parts.length >= 1) {
            const split = title.split("+");
            let c: ITreeNode = container;

            for (let i = 0; i < split.length; ++i) {
                if (!c.nodes.has(split[i])) {
                    c.nodes.set(split[i], { tests: [], nodes: new Map<string, ITreeNode>(), isNested: (i > 0) });
                }
                c = c.nodes.get(split[i]);
            }

            this.addToObject(c, parts);
        } else {
            container.tests.push(title);
        }
    }

    private createTestNode(parentFqn: string, test: ITreeNode): TestNode[] {
        let testNodes: TestNode[];

        testNodes = Array.from(test.nodes.keys()).sort().map((key) => {
            const fqn = parentFqn ? (test.nodes.get(key).isNested ? `${parentFqn}+${key}` : `${parentFqn}.${key}`) : key;
            return new TestNode(
                fqn,
                key,
                undefined,
                this.testResults,
                this.createTestNode(
                    fqn,
                    test.nodes.get(key)));
        });

        const sorted = test.tests.sort();
        const theoryMap = new Map<string, TestNode>();

        for (let i = 0; i < test.tests.length; ++i) {
            const t = sorted[i];
            const openingParensIndex = t.indexOf("(");
            const hasParams = openingParensIndex > 0 && t[t.length - 1] === ")";

            if (hasParams) {
                let methodName = t.substr(0, openingParensIndex);
                let params: string;

                if (methodName[methodName.length - 1] === " ") {
                    // ms test separates method from parameters by a space
                    methodName = methodName.trimRight();
                    params = t.substr(openingParensIndex - 1);
                } else {
                    params = t.substr(openingParensIndex);
                }

                const fqn = `${parentFqn}.${methodName}`;

                let theoryNode: TestNode;

                if (theoryMap.has(methodName)) {
                    theoryNode = theoryMap.get(methodName);
                } else {
                    theoryNode = new TestNode(
                        fqn,
                        methodName,
                        undefined,
                        this.testResults,
                        [],
                        true);
                    theoryMap.set(methodName, theoryNode);
                    testNodes.push(theoryNode);
                }

                const method = new TestNode(fqn, t, params, this.testResults, undefined, true);
                theoryMap.get(methodName).children.push(method);
                if (theoryNode.children.length === 1) {
                    // refreshes the icon, which would normally be set in ctor
                    // however, we changed this node to a folder by pushing a child so we need to refresh
                    theoryNode.setIcon(this.testResults);
                }

                this.allNodes.push(method);
            } else {
                testNodes.push(new TestNode(`${parentFqn}.${t}`, t, undefined, this.testResults));
            }
        }

        this.allNodes = this.allNodes.concat(testNodes);

        return testNodes;
    }

    private updateWithDiscoveringTest() {
        this.discoveredTests = null;
        this._onDidChangeTreeData.fire();
    }

    private updateWithDiscoveredTests(results: IDiscoverTestsResult[]) {
        this.allNodes = [];
        this.discoveredTests = [].concat(...results.map( (r) => r.testNames));
        this.statusBar.discovered(this.discoveredTests.length);
        this._onDidChangeTreeData.fire();
    }

    private updateTreeWithRunningTests(testRunContext: ITestRunContext) {

        const filter = testRunContext.isSingleTest ?
            ((testNode: TestNode) => testNode.fqn === testRunContext.testName)
            : ((testNode: TestNode) => testNode.fqn.startsWith(testRunContext.testName));

        const testRun = this.allNodes.filter( (testNode: TestNode) => filter(testNode));

        this.statusBar.testRunning(testRun.length);

        testRun.forEach( (testNode: TestNode) => {
            testNode.setAsLoading();
            this._onDidChangeTreeData.fire(testNode);
        });
    }

    private addTestResults(results: ITestResult) {

        const fullNamesForTestResults = results.testResults.map( (r) => r.fullName);

        if (results.clearPreviousTestResults) {
            this.discoveredTests = [...fullNamesForTestResults];
            this.testResults = null;
        } else {
            const newTests = fullNamesForTestResults.filter( (r) => this.discoveredTests.indexOf(r) === -1);

            if (newTests.length > 0) {
                this.discoveredTests.push(...newTests);
            }
        }

        this.discoveredTests = this.discoveredTests.sort();

        this.statusBar.discovered(this.discoveredTests.length);

        if (this.testResults) {
            results.testResults.forEach( (newTestResult: TestResult) => {
                const indexOldTestResult = this.testResults.findIndex( (tr) => tr.fullName === newTestResult.fullName);

                if (indexOldTestResult < 0) {
                    this.testResults.push(newTestResult);
                } else {
                    this.testResults[indexOldTestResult] = newTestResult;
                }
            });
        } else {
            this.testResults = results.testResults;
        }

        this.statusBar.testRun(results.testResults);

        this._onDidChangeTreeData.fire();
    }
}
