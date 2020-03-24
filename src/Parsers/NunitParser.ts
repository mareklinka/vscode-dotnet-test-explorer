import { ResultParserBase } from './ResultParserBase';
import { TestResult } from '../testResult';

export class NUnitParser extends ResultParserBase {
  public parseUnitTest(resultElement: any, testElement: any, runner: string): TestResult {
    if (runner.indexOf('nunit3testexecutor') === -1) {
      throw new Error(`Unknown NUnit test runner version: ${runner}`);
    }

    const result = new TestResult(
        this.getAttributeValue(resultElement, 'testId'),
        this.getAttributeValue(resultElement, 'outcome'),
        this.getTextContentForTag(resultElement, 'Message'),
        this.getTextContentForTag(resultElement, 'StackTrace'),
        this.getAttributeValue(this.findChildElement(testElement, 'TestMethod'), 'className'),
        this.getAttributeValue(testElement, 'name'),
        this.parseDuration(resultElement));

        return result;
  }
}
