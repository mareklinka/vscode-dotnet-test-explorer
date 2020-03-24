import * as assert from 'assert';
import { DOMParser, Element } from 'xmldom';
import { XmlUtilities } from '../../src/Parsers/XmlUtilities';
import { MsTestParser } from '../../src/Parsers/MsTestParser';

suite('MsTestParser', () => {
  test('Parses MSTest runner 2 test', () => {
    const [resultNode, testNode, runner] = getXmlNodes('v2');
    const result = new MsTestParser().parseUnitTest(resultNode, testNode, runner);

    assert.strictEqual(result.id, 'b087c7ea-9f4d-48a6-ac25-32abf074d9be');
    assert.strictEqual(result.fullName, 'MsTestTests.TestClass1.DataTest (Second)');
    assert.strictEqual(result.outcome, 'Passed');
    assert.strictEqual(result.duration, '02:02.002');
  });

  test('Throws on unknown MSTest runner version', () => {
    const [resultNode, testNode, runner] = getXmlNodes('v3');

    assert.throws(
      () => new MsTestParser().parseUnitTest(resultNode, testNode, runner),
      'Unknown MSTest test runner version'
    );
  });
});

// tslint:disable: max-line-length
function getXmlNodes(runnerVersion: string): [Element, Element, string] {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
    <TestRun id="2513a28f-f8ee-463f-bdd9-90df4e601b88" name="some name" runUser="some user" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
      <Results>
      <UnitTestResult executionId="512470e5-f84c-4e4a-9404-7f9a5068fe8b" testId="b087c7ea-9f4d-48a6-ac25-32abf074d9be" testName="DataTest (Second)" computerName="name" duration="00:02:02.0020054" startTime="2020-03-24T09:07:40.6270353+08:00" endTime="2020-03-24T09:07:40.6284405+08:00" testType="13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b" outcome="Passed" testListId="8c84fa94-04c1-424b-9868-57a2d4851a1d" relativeResultsDirectory="512470e5-f84c-4e4a-9404-7f9a5068fe8b" />
      </Results>
      <TestDefinitions>
      <UnitTest name="DataTest (Second)" storage="mstesttests.dll" id="b087c7ea-9f4d-48a6-ac25-32abf074d9be">
      <Execution id="512470e5-f84c-4e4a-9404-7f9a5068fe8b" />
      <TestMethod codeBase="MSTestTests.dll" adapterTypeName="executor://mstestadapter/${runnerVersion}" className="MsTestTests.TestClass1" name="DataTest" />
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

  const resultNode = unitTestResultMap.get('b087c7ea-9f4d-48a6-ac25-32abf074d9be');
  const testNode = unitTestMap.get('b087c7ea-9f4d-48a6-ac25-32abf074d9be');
  const runner = XmlUtilities.getAttributeValue(
    XmlUtilities.findChildElement(testNode, 'TestMethod'),
    'adapterTypeName'
  );

  return [resultNode, testNode, runner];
}
