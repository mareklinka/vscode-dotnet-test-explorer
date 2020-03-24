import * as assert from 'assert';
import { DOMParser, Element } from 'xmldom';
import { XmlUtilities } from '../../src/Parsers/XmlUtilities';
import { NUnitParser } from '../../src/Parsers/NunitParser';

suite('NunitParser', () => {
  test('Parses NUnit runner 3 test', () => {
    const [resultNode, testNode, runner] = getXmlNodes('nunit3testexecutor');
    const result = new NUnitParser().parseUnitTest(resultNode, testNode, runner);

    assert.strictEqual(result.id, '4bbe5763-9f35-e99b-622f-858a16efeeee');
    assert.strictEqual(result.fullName, 'NunitTests.TestClass3(\"First\").TwoTimes(\"Second\")');
    assert.strictEqual(result.outcome, 'Passed');
    assert.strictEqual(result.duration, '01:01.001');
  });

  test('Throws on unknown NUnit runner version', () => {
    const [resultNode, testNode, runner] = getXmlNodes('nunit4testexecutor');

    assert.throws(
      () => new NUnitParser().parseUnitTest(resultNode, testNode, runner),
      'Unknown NUnit test runner version'
    );
  });
});

// tslint:disable: max-line-length
function getXmlNodes(runnerVersion: string): [Element, Element, string] {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
    <TestRun id="2513a28f-f8ee-463f-bdd9-90df4e601b88" name="some name" runUser="some user" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
      <Results>
        <UnitTestResult executionId="acec32da-d2a3-45e8-8d58-415a887c52c9" testId="4bbe5763-9f35-e99b-622f-858a16efeeee" testName="TwoTimes(&quot;Second&quot;)" computerName="name" duration="00:01:01.0010000" startTime="2020-03-24T09:06:36.0000000+08:00" endTime="2020-03-24T09:06:36.0000000+08:00" testType="13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b" outcome="Passed" testListId="8c84fa94-04c1-424b-9868-57a2d4851a1d" relativeResultsDirectory="acec32da-d2a3-45e8-8d58-415a887c52c9" />
      </Results>
      <TestDefinitions>
      <UnitTest name="TwoTimes(&quot;Second&quot;)" storage="nunittests.dll" id="4bbe5763-9f35-e99b-622f-858a16efeeee">
        <Execution id="acec32da-d2a3-45e8-8d58-415a887c52c9" />
        <TestMethod codeBase="NunitTests.dll" adapterTypeName="executor://${runnerVersion}/" className="NunitTests.TestClass3(&quot;First&quot;)" name="TwoTimes(&quot;Second&quot;)" />
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

  const resultNode = unitTestResultMap.get('4bbe5763-9f35-e99b-622f-858a16efeeee');
  const testNode = unitTestMap.get('4bbe5763-9f35-e99b-622f-858a16efeeee');
  const runner = XmlUtilities.getAttributeValue(
    XmlUtilities.findChildElement(testNode, 'TestMethod'),
    'adapterTypeName'
  );

  return [resultNode, testNode, runner];
}
