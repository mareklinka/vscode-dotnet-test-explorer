import { Element, Node } from 'xmldom';
import * as moment from 'moment';
import { TestResult } from '../testResult';
import { XmlUtilities } from './XmlUtilities';

export abstract class ResultParserBase {
  public abstract parseUnitTest(resultElement: Element, testElement: Element, runner: string): TestResult;

  parseDuration(resultElement: Element): string {
    let duration = XmlUtilities.getAttributeValue(resultElement, 'duration');
    const parsed = moment.duration(duration);
    duration = parsed.isValid() ? moment.utc(moment.duration(duration).asMilliseconds()).format('mm:ss.SSS') : '';

    return duration;
  }

  findChildElement(node: Node, name: string): Node {
    return XmlUtilities.findChildElement(node, name);
  }

  getAttributeValue(node: Node, name: string): string {
    return XmlUtilities.getAttributeValue(node, name);
  }

  getTextContentForTag(parentNode: Node, tagName: string): string {
    return XmlUtilities.getTextContentForTag(parentNode, tagName);
  }
}
