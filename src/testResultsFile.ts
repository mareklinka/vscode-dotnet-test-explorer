// tslint:disable-next-line: no-implicit-any
import * as fs from 'fs';
import * as moment from 'moment';
import { DOMParser, Element, Node } from 'xmldom';
import { TestResult } from './testResult';

function findChildElement(node: Node, name: string): Node {
  let child = node.firstChild;
  while (child) {
    if (child.nodeName === name) {
      return child;
    }

    child = child.nextSibling;
  }

  return undefined;
}

function getAttributeValue(node: Node, name: string): string {
  const attribute = node.attributes.getNamedItem(name);
  return attribute ? attribute.nodeValue : undefined;
}

function getTextContentForTag(parentNode: Node, tagName: string): string {
  const node = parentNode.getElementsByTagName(tagName);
  return node.length > 0 ? node[0].textContent : '';
}

function parseUnitTestResults(xml: Element): Array<TestResult> {
  const results: Array<TestResult> = [];
  const nodes = xml.getElementsByTagName('UnitTestResult');

  // TSLint wants to use for-of here, but nodes doesn't support it
  for (let i = 0; i < nodes.length; i++) {
    // tslint:disable-line
    let duration = getAttributeValue(nodes[i], 'duration');
    const parsed = moment.duration(duration);
    duration = parsed.isValid()
      ? moment.utc(moment.duration(duration).asMilliseconds()).format('mm:ss.SSS')
      : '';

    results.push(
      new TestResult(
        getAttributeValue(nodes[i], 'testId'),
        getAttributeValue(nodes[i], 'outcome'),
        getTextContentForTag(nodes[i], 'Message'),
        getTextContentForTag(nodes[i], 'StackTrace'),
        duration
      )
    );
  }

  return results;
}

function updateUnitTestDefinitions(xml: Element, results: Array<TestResult>): void {
  const nodes = xml.getElementsByTagName('UnitTest');
  const names = new Map<string, any>();

  for (let i = 0; i < nodes.length; i++) {
    const id = getAttributeValue(nodes[i], 'id');
    const testMethod = findChildElement(nodes[i], 'TestMethod');
    if (testMethod) {
      names.set(id, {
        className: getAttributeValue(testMethod, 'className'),
        method: getAttributeValue(nodes[i], 'name')
      });
    }
  }

  for (const result of results) {
    const name = names.get(result.id);
    if (name) {
      result.updateName(name.className, name.method);
    }
  }
}

export class TestResultsFile {
  public parseResults(filePath: string): Promise<Array<TestResult>> {
    return new Promise((resolve, reject) => {
      let results: Array<TestResult>;
      fs.readFile(filePath, (err, data) => {
        if (!err) {
          const xdoc = new DOMParser().parseFromString(data.toString(), 'application/xml');
          results = parseUnitTestResults(xdoc.documentElement);

          updateUnitTestDefinitions(xdoc.documentElement, results);

          try {
            fs.unlinkSync(filePath);
          } catch {}

          resolve(results);
        }
      });
    });
  }
}
