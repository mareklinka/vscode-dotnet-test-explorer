import * as fs from 'fs';
import { DOMParser } from 'xmldom';
import { TestResult } from './testResult';
import { ResultParser } from './Parsers/ResultParser';
import { Logger } from './logger';

export class TestResultsFile {
  public parseResults(filePath: string): Promise<Array<TestResult>> {
    return new Promise((resolve, reject) => {
      let results: Array<TestResult>;
      fs.readFile(filePath, (err, data) => {
        if (!err) {
          const xdoc = new DOMParser().parseFromString(data.toString(), 'application/xml');
          try {
            results = ResultParser.parseUnitTestResult(xdoc.documentElement);

            try {
              fs.unlinkSync(filePath);
            } catch {
              Logger.LogWarning(`Unable to remove the test results file at: ${filePath}`)
            }

            resolve(results);
          } catch (error) {
            Logger.LogError('Parsing of test results failed.', error);
            reject(error);
          }
        } else {
          reject();
        }
      });
    });
  }
}
