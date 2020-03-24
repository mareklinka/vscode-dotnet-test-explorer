import { Element } from 'xmldom';
import { TestResult } from '../testResult';
import { XUnitParser } from './XunitParser';
import { ResultParserBase } from './ResultParserBase';
import { NUnitParser } from './NunitParser';
import { MsTestParser } from './MsTestParser';
import { XmlUtilities } from './XmlUtilities';

export class ResultParser {
  public static parseUnitTestResult(xml: Element): Array<TestResult> {
    const results: Array<TestResult> = [];
    const unitTestResultMap = new Map<string, Element>();
    const unitTestMap = new Map<string, Element>();

    Array.from(xml.getElementsByTagName('UnitTestResult')).forEach(e => {
      unitTestResultMap.set(XmlUtilities.getAttributeValue(e, 'testId'), e);
    });

    Array.from(xml.getElementsByTagName('UnitTest')).forEach(e => {
      unitTestMap.set(XmlUtilities.getAttributeValue(e, 'id'), e);
    });

    unitTestResultMap.forEach((value: Element, key: string) => {
      const resultElement = value;
      const testElement = unitTestMap.get(key);

      const runner = XmlUtilities.getAttributeValue(
        XmlUtilities.findChildElement(testElement, 'TestMethod'),
        'adapterTypeName'
      );
      let runnerSpecificParser: ResultParserBase;

      if (runner.indexOf('xunit') >= 0) {
        runnerSpecificParser = new XUnitParser();
      } else if (runner.indexOf('nunit') >= 0) {
        runnerSpecificParser = new NUnitParser();
      } else if (runner.indexOf('mstest') >= 0) {
        runnerSpecificParser = new MsTestParser();
      } else {
        throw new Error(`Unknown test adapter encountered: ${runner}`);
      }

      results.push(runnerSpecificParser.parseUnitTest(resultElement, testElement, runner));
    });

    return results;
  }
}
