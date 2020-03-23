import * as assert from 'assert';
import * as vscode from 'vscode';
import { GotoTest } from '../src/gotoTest';
import { TestNode } from '../src/testNode';
import { ITestSymbol, Symbols } from '../src/symbols';
import sinon = require('sinon');

suite('Find test location', () => {
  const getSymbolsStub = sinon.stub(Symbols, 'getSymbols');

  test('No symbols', async () => {
    const symbols: Array<vscode.SymbolInformation> = [];

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();

    await assert.rejects(async () => await gotoTest.findTestLocation(symbols, testNode), 'no symbols found');
  });

  test('No symbol matching', async () => {
    const symbols = [GetSymbol('Test', vscode.SymbolKind.Method, 'c:\\temp\\test.txt')];

    const testNode = new TestNode('NotFound', '', 'NotFound', [], []);

    const gotoTest = new GotoTest();

    await assert.rejects(async () => await gotoTest.findTestLocation(symbols, testNode), 'no symbols found');
  });

  test('One symbol matching', async () => {
    const symbols = [GetSymbol('Test', vscode.SymbolKind.Method, 'c:\\temp\\test.txt')];
    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' }
    ];

    getSymbolsStub
      .withArgs(symbols[0].location.uri)
      .returns(Promise.resolve(testSymbols));

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.txt').fsPath);
  });

  test('One F# symbol matching', async () => {
    const symbols = [GetSymbol('Test', vscode.SymbolKind.Variable, 'c:\\temp\\test.fs')];
    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' }
    ];

    getSymbolsStub
      .withArgs(symbols[0].location.uri)
      .returns(Promise.resolve(testSymbols));

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.fs').fsPath);
  });

  test('One F# symbol with spaces matching', async () => {
    const symbols = [GetSymbol('Test with spaces', vscode.SymbolKind.Variable, 'c:\\temp\\test.fs')];
    const testSymbols: Array<ITestSymbol> = [
      {
        documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method),
        parentName: 'Test',
        fullName: 'Test with spaces'
      }
    ];

    getSymbolsStub
      .withArgs(symbols[0].location.uri)
      .returns(Promise.resolve(testSymbols));

    const testNode = new TestNode('Test with spaces', 'Test with spaces', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.fs').fsPath);
  });

  test('Multiple symbols matching with no namespace matching uri', async () => {
    const symbols = [
      GetSymbol('Test', vscode.SymbolKind.Method, 'file:\\c:/temp/folderx/test.txt'),
      GetSymbol('Test', vscode.SymbolKind.Method, 'file:\\c:/temp/foldery/test.txt')
    ];
    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' }
    ];

    for (let i = 0; i < symbols.length; ++i) {
      getSymbolsStub.withArgs(symbols[i].location.uri, sinon.match.bool).returns(Promise.resolve([testSymbols[i]]));
    }

    const testNode = new TestNode('MyFolder.Test.Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    await assert.rejects(async () => await gotoTest.findTestLocation(symbols, testNode));
  });

  test('Match with multiple symbols for tests without namespace', async () => {
    const symbols = [
      GetSymbol('Test', vscode.SymbolKind.Method, 'file:\\c:/temp/test3.txt'),
      GetSymbol('Test', vscode.SymbolKind.Method, 'file:\\c:/temp/myfolder/test.txt'),
      GetSymbol('Test', vscode.SymbolKind.Method, 'file:\\c:/temp/folderx/test.txt')
    ];

    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' }
    ];

    for (let i = 0; i < symbols.length; ++i) {
      getSymbolsStub.withArgs(symbols[i].location.uri).returns(Promise.resolve([testSymbols[i]]));
    }

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    await assert.rejects(async () => await gotoTest.findTestLocation(symbols, testNode), 'multiple candidates found');
  });

  test('Classes are not matches', async () => {
    const symbols = [
      GetSymbol('Test', vscode.SymbolKind.Class, 'c:\\temp\\test2.txt'),
      GetSymbol('Test', vscode.SymbolKind.Method, 'c:\\temp\\test.txt')
    ];

    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Class), parentName: 'Test', fullName: 'Test' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: 'Test', fullName: 'Test' }
    ];

    for (let i = 0; i < symbols.length; ++i) {
      getSymbolsStub.withArgs(symbols[i].location.uri).returns(Promise.resolve([testSymbols[i]]));
    }

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.txt').fsPath);
  });

  test('Match with multiple symbols matching start of name', async () => {
    const symbols = [
      GetSymbol('Test3', vscode.SymbolKind.Method, 'c:\\temp\\test3.txt'),
      GetSymbol('Test2', vscode.SymbolKind.Method, 'c:\\temp\\test2.txt'),
      GetSymbol('Test', vscode.SymbolKind.Method, 'c:\\temp\\test.txt')
    ];

    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test3', vscode.SymbolKind.Class), parentName: '', fullName: 'Test3' },
      { documentSymbol: GetDocumentSymbol('Test2', vscode.SymbolKind.Method), parentName: '', fullName: 'Test2' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: '', fullName: 'Test' },
    ];

    for (let i = 0; i < symbols.length; ++i) {
      getSymbolsStub.withArgs(symbols[i].location.uri).returns(Promise.resolve([testSymbols[i]]));
    }

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.txt').fsPath);
  });

  test('Match with multiple symbols matching start of name for xunit theory', async () => {
    const symbols = [
      GetSymbol('Test3', vscode.SymbolKind.Method, 'c:\\temp\\test3.txt'),
      GetSymbol('Test2', vscode.SymbolKind.Method, 'c:\\temp\\test2.txt'),
      GetSymbol('Test(param: value)', vscode.SymbolKind.Method, 'c:\\temp\\test.txt')
    ];

    const testSymbols: Array<ITestSymbol> = [
      { documentSymbol: GetDocumentSymbol('Test3', vscode.SymbolKind.Class), parentName: '', fullName: 'Test3' },
      { documentSymbol: GetDocumentSymbol('Test2', vscode.SymbolKind.Method), parentName: '', fullName: 'Test2' },
      { documentSymbol: GetDocumentSymbol('Test', vscode.SymbolKind.Method), parentName: '', fullName: 'Test' },
    ];

    for (let i = 0; i < symbols.length; ++i) {
      getSymbolsStub.withArgs(symbols[i].location.uri).returns(Promise.resolve([testSymbols[i]]));
    }

    const testNode = new TestNode('Test', 'Test', '', [], []);

    const gotoTest = new GotoTest();
    const result = await gotoTest.findTestLocation(symbols, testNode);

    assert.strictEqual(result.uri.fsPath, vscode.Uri.parse('c:\\temp\\test.txt').fsPath);
  });
});

function GetSymbol(name: string, kind: vscode.SymbolKind, filePath: string): vscode.SymbolInformation {
  return new vscode.SymbolInformation(
    name,
    kind,
    '',
    new vscode.Location(
      vscode.Uri.parse(filePath),
      new vscode.Range(new vscode.Position(10, 10), new vscode.Position(20, 20))
    )
  );
}

function GetDocumentSymbol(name: string, kind: vscode.SymbolKind): vscode.DocumentSymbol {
  return new vscode.DocumentSymbol(
    name,
    '',
    kind,
    new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1)),
    new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1))
  );
}
