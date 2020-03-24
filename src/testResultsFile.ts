import * as fs from 'fs';
import { DOMParser } from 'xmldom';
import { TestResult } from './testResult';
import { ResultParser } from './Parsers/ResultParser';
import { Logger } from './logger';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

export class TestResultsFile {
  public async parseResults(filePath: string): Promise<Array<TestResult>> {
    let results: Array<TestResult> = [];

    try {
      const data = await readFile(filePath);
      const xdoc = new DOMParser().parseFromString(data.toString(), 'application/xml');
      results = ResultParser.parseUnitTestResult(xdoc.documentElement);

      try {
        await unlink(filePath);
      } catch {
        Logger.LogWarning(`Unable to remove the test results file at: ${filePath}`);
      }
    } catch (error) {
      Logger.LogError('Parsing of test results failed.', error);
    }

    return results;
  }
}
