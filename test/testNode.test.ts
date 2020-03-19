import * as assert from "assert";
import * as vscode from "vscode";
import {TestNode} from "../src/testNode";
import { TestResult } from "../src/testResult";

suite("Icon tests", () => {

    test("Node that is loading", () => {
        const node = new TestNode("Loading node", "Loading node", undefined, null);
        node.setAsLoading();

        assert.equal(node.icon, "spinner.svg");
    });

    test("Folder with no test result", () => {
        const node = new TestNode("Folder node", "Folder node", undefined, null, [new TestNode("parent.child", "child", undefined, null)]);

        assert.equal(node.icon, "namespace.png");
    });

    test("Folder with one failed test result", () => {
        const testResult = [
            GetTestResult("1", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("2", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("3", "Failed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace.MyClass", "MyClass", undefined, testResult, [new TestNode("parent.child", "child", undefined, null)]);

        assert.equal(node.icon, "namespaceFailed.png");
    });

    test("Folder with one not executed test result", () => {
        const testResult = [
            GetTestResult("1", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("2", "NotExecuted", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("3", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace.Myclass", "MyClass", undefined, testResult, [new TestNode("parent.child", "child", undefined, null)]);

        assert.equal(node.icon, "namespaceNotExecuted.png");
    });

    test("Folder with all passed test result", () => {
        const testResult = [
            GetTestResult("1", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("2", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("3", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace.MyClass", "MyClass", undefined, testResult, [new TestNode("parent.child", "child", undefined, null)]);

        assert.equal(node.icon, "namespacePassed.png");
    });

    test("Folder with all passed test result (none xunit result file)", () => {
        // mstest and nunit present only the method name whereas xunit includes the full namespace and class name
        const testResult = [
            GetTestResult("1", "Passed", "NameSpace.MyClass", "Test1"),
            GetTestResult("2", "Passed", "NameSpace.MyClass", "Test2"),
            GetTestResult("3", "Passed", "NameSpace.MyClass", "Test3"),
        ];
        const node = new TestNode("NameSpace.MyClass", "MyClass", undefined, testResult, [new TestNode("parent.child", "child", undefined, null)]);

        assert.equal(node.icon, "namespacePassed.png");
    });

    test("Test with no test result", () => {
        const node = new TestNode("Test node", "Test node", undefined, null);

        assert.equal(node.icon, "run.png");
    });

    test("Test with passed test result", () => {
        const testResult = [GetTestResult("1", "Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass.Test1", "Test1", undefined, testResult);

        assert.equal(node.icon, "testPassed.png");
    });

    test("Test with failed test result", () => {
        const testResult = [GetTestResult("1", "Failed", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass.Test1", "Test1", undefined, testResult);

        assert.equal(node.icon, "testFailed.png");
    });

    test("Test with not executed test result", () => {
        const testResult = [GetTestResult("1", "NotExecuted", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass.Test1", "Test1", undefined, testResult);

        assert.equal(node.icon, "testNotExecuted.png");
    });
});

function GetTestResult(id: string, outcome: string, className: string, method: string) {
    const testResult = new TestResult(id, outcome, "", "");
    testResult.updateName(className, method);
    return testResult;
}
