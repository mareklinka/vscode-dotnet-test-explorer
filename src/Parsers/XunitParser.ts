import { ResultParserBase } from './ResultParserBase';
import { TestResult } from '../testResult';

export class XUnitParser extends ResultParserBase {
  public parseUnitTest(resultElement: any, testElement: any, runner: string): TestResult {
    if (runner.indexOf('VsTestRunner2') === -1) {
      throw new Error(`Unknown XUnit test runner version: ${runner}`);
    }

    const className = this.getAttributeValue(this.findChildElement(testElement, 'TestMethod'), 'className');
    const methodName = this.getAttributeValue(testElement, 'name').substr(className.length + 1);

    const result = new TestResult(
      this.getAttributeValue(resultElement, 'testId'),
      this.getAttributeValue(resultElement, 'outcome'),
      this.getTextContentForTag(resultElement, 'Message'),
      this.getTextContentForTag(resultElement, 'StackTrace'),
      className,
      methodName,
      this.parseDuration(resultElement)
    );

    return result;
  }
}
