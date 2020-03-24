import * as assert from 'assert';
import { DOMParser, Element } from 'xmldom';
import { XUnitParser } from '../../src/Parsers/XunitParser';
import { XmlUtilities } from '../../src/Parsers/XmlUtilities';

suite('XunitParser', () => {
  test('Parses XUnit runner 2 test', () => {
    const [resultNode, testNode, runner] = getXmlNodes('VsTestRunner2');
    const result = new XUnitParser().parseUnitTest(resultNode, testNode, runner);

    assert.strictEqual(result.id, 'ac8cba60-9db4-d654-a8be-701643d402ef');
    assert.strictEqual(result.fullName, 'XunitTests.TestClass4.ErrorClosedParenthesisWithChar(str: ")A")');
    assert.strictEqual(result.outcome, 'Passed');
    assert.strictEqual(result.duration, '00:01.001');
  });

  test('Throws on unknown XUnit runner version', () => {
    const [resultNode, testNode, runner] = getXmlNodes('VsTestRunner3');

    assert.throws(
      () => new XUnitParser().parseUnitTest(resultNode, testNode, runner),
      'Unknown XUnit test runner version'
    );
  });
});

// tslint:disable: max-line-length
function getXmlNodes(runnerVersion: string): [Element, Element, string] {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
    <TestRun id="2513a28f-f8ee-463f-bdd9-90df4e601b88" name="some name" runUser="some user" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
      <Results>
        <UnitTestResult executionId="c3672828-36f5-4601-b55a-18c186671b1a" testId="ac8cba60-9db4-d654-a8be-701643d402ef" testName="XunitTests.TestClass4.ErrorClosedParenthesisWithChar(str: &quot;)A&quot;)" computerName="name" duration="00:00:01.0010000" startTime="2020-03-24T09:05:27.1236191+08:00" endTime="2020-03-24T09:05:27.1236192+08:00" testType="13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b" outcome="Passed" testListId="8c84fa94-04c1-424b-9868-57a2d4851a1d" relativeResultsDirectory="c3672828-36f5-4601-b55a-18c186671b1a" />
      </Results>
      <TestDefinitions>
      <UnitTest name="XunitTests.TestClass4.ErrorClosedParenthesisWithChar(str: &quot;)A&quot;)" storage="xunittests.dll" id="ac8cba60-9db4-d654-a8be-701643d402ef">
      <Execution id="c3672828-36f5-4601-b55a-18c186671b1a" />
      <TestMethod codeBase="XunitTests.dll" adapterTypeName="executor://xunit/${runnerVersion}/netcoreapp" className="XunitTests.TestClass4" name="ErrorClosedParenthesisWithChar" />
    </UnitTest>
      </TestDefinitions>
    </TestRun>`;

  const xdoc = new DOMParser().parseFromString(xml.toString(), 'application/xml');
  const unitTestResultMap = new Map<string, Element>();
  const unitTestMap = new Map<string, Element>();

  Array.from(xdoc.getElementsByTagName('UnitTestResult')).forEach(e => {
    unitTestResultMap.set(XmlUtilities.getAttributeValue(e, 'testId'), e);
  });

  Array.from(xdoc.getElementsByTagName('UnitTest')).forEach(e => {
    unitTestMap.set(XmlUtilities.getAttributeValue(e, 'id'), e);
  });

  const resultNode = unitTestResultMap.get('ac8cba60-9db4-d654-a8be-701643d402ef');
  const testNode = unitTestMap.get('ac8cba60-9db4-d654-a8be-701643d402ef');
  const runner = XmlUtilities.getAttributeValue(
    XmlUtilities.findChildElement(testNode, 'TestMethod'),
    'adapterTypeName'
  );

  return [resultNode, testNode, runner];
}
