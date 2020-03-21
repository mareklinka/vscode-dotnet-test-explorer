
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { commands, Disposable, Event, EventEmitter } from 'vscode';
import * as vscode from 'vscode';
import { Executor } from './executor';
import { Logger } from './logger';
import { TestDirectories } from './testDirectories';
import { discoverTests, IDiscoverTestsResult } from './testDiscovery';
import { TestNode } from './testNode';
import { ITestResult, TestResult } from './testResult';
import { TestResultsFile } from './testResultsFile';
import { Utility } from './utility';

export interface IWaitForAllTests {
  numberOfTestDirectories: number;
  currentNumberOfFiles: number;
  testResults: Array<TestResult>;
  clearPreviousTestResults: boolean;
  testsAlreadyRunning: boolean;
}

export interface ITestRunContext {
  testName: string;
  isSingleTest: boolean;
  collectCoverage: boolean;
}

export class TestCommands implements Disposable {
  private readonly onTestDiscoveryStartedEmitter = new EventEmitter<string>();
  private readonly onTestDiscoveryFinishedEmitter = new EventEmitter<Array<IDiscoverTestsResult>>();
  private readonly onTestRunEmitter = new EventEmitter<ITestRunContext>();
  private readonly onNewTestResultsEmitter = new EventEmitter<ITestResult>();
  private lastRunTestContext?: ITestRunContext = undefined;
  private testResultsFolder = '';
  private waitForAllTests: IWaitForAllTests = {
    currentNumberOfFiles: 0,
    testsAlreadyRunning: false,
    testResults: [],
    clearPreviousTestResults: false,
    numberOfTestDirectories: 0
  };
  private testDiscoveryRunning = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly resultsFile: TestResultsFile,
    private readonly testDirectories: TestDirectories
  ) {
    Executor.onTestProcessFinished(this.sendTestResults, this);
  }

  public dispose(): void {
    if (!this.testResultsFolder) {
      return;
    }

    this.clearTempDirectory(this.testResultsFolder);
  }

  public discoverTests() {
    if (this.testDiscoveryRunning) {
      Logger.Log('Test discovery already running');
      return;
    }

    this.testDiscoveryRunning = true;

    this.onTestDiscoveryStartedEmitter.fire();

    this.testDirectories.clearTestsForDirectory();

    const testDirectories = this.testDirectories.getTestDirectories();

    this.waitForAllTests = {
      currentNumberOfFiles: 0,
      testsAlreadyRunning: false,
      testResults: [],
      clearPreviousTestResults: false,
      numberOfTestDirectories: testDirectories.length
    };

    this.setupTestResultFolder();

    const discoveredTests: Array<IDiscoverTestsResult> = [];

    const runSeqOrAsync = async () => {
      const addToDiscoveredTests = (discoverdTestResult: IDiscoverTestsResult, dir: string) => {
        if (discoverdTestResult.testNames.length <= 0) {
          this.testDirectories.removeTestDirectory(dir);
        } else {
          discoveredTests.push(discoverdTestResult);
        }
      };

      try {
        if (Utility.runInParallel) {
          await Promise.all(
            testDirectories.map(async dir => await addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir))
          );
        } else {
          for (const dir of testDirectories) {
            addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir);
          }
        }

        // Number of test directories might have been decreased
        // due to none-test directories being added by the glob / workspace filter
        // tslint:disable-next-line: no-non-null-assertion
        this.waitForAllTests!.numberOfTestDirectories = this.testDirectories.getTestDirectories().length;

        this.onTestDiscoveryFinishedEmitter.fire(discoveredTests);
      } catch (error) {
        this.onTestDiscoveryFinishedEmitter.fire([]);
      } finally {
        this.testDiscoveryRunning = false;
      }
    };

    runSeqOrAsync();
  }

  public async discoverTestsInFolder(dir: string): Promise<IDiscoverTestsResult> {
    const testsForDir: IDiscoverTestsResult = await discoverTests(dir, Utility.additionalArgumentsOption);
    this.testDirectories.addTestsForDirectory(testsForDir.testNames.map(tn => ({ dir, name: tn })));
    return testsForDir;
  }

  public get testResultFolder(): string {
    return this.testResultsFolder;
  }

  public get onTestDiscoveryStarted(): Event<string> {
    return this.onTestDiscoveryStartedEmitter.event;
  }

  public get onTestDiscoveryFinished(): Event<Array<IDiscoverTestsResult>> {
    return this.onTestDiscoveryFinishedEmitter.event;
  }

  public get onTestRun(): Event<ITestRunContext> {
    return this.onTestRunEmitter.event;
  }

  public get onNewTestResults(): Event<ITestResult> {
    return this.onNewTestResultsEmitter.event;
  }

  public sendNewTestResults(testResults: ITestResult) {
    this.onNewTestResultsEmitter.fire(testResults);
  }

  public sendRunningTest(testContext: ITestRunContext) {
    this.onTestRunEmitter.fire(testContext);
  }

  public watchRunningTests(namespace: string): void {
    const textContext = { testName: namespace, isSingleTest: false, collectCoverage: false };
    this.sendRunningTest(textContext);
  }

  public runAllTests(): void {
    this.runTestCommand('', false, false);
  }

  public runTest(test: TestNode): void {
    this.runTestByName(test.fqn, !test.isFolder);
  }

  public coverTest(test: TestNode): void {
    this.coverTestByName(test.fqn, !test.isFolder);
  }

  public runTestByName(testName: string, isSingleTest: boolean): void {
    this.runTestCommand(testName, isSingleTest, false, false);
  }

  public coverTestByName(testName: string, isSingleTest: boolean): void {
    this.runTestCommand(testName, isSingleTest, true, false);
  }

  public debugTestByName(testName: string, isSingleTest: boolean): void {
    this.runTestCommand(testName, isSingleTest, false, true);
  }

  public rerunLastCommand(): void {
    if (this.lastRunTestContext) {
      this.runTestCommand(
        this.lastRunTestContext.testName,
        this.lastRunTestContext.isSingleTest,
        this.lastRunTestContext.collectCoverage
      );
    }
  }

  private sendTestResults() {
    fs.readdir(this.testResultsFolder, (err, files) => {
      if (!err) {
        const fileParsers: Array<Promise<void>> = [];

        for (const i in files) {
          if (path.extname(files[i]) === '.trx') {
            const p = this.resultsFile.parseResults(path.join(this.testResultsFolder, files[i])).then(testResults => {
              this.waitForAllTests.testResults = this.waitForAllTests.testResults.concat(testResults);
              this.waitForAllTests.currentNumberOfFiles++;
              Logger.Log(`Parsed ${this.waitForAllTests.currentNumberOfFiles} file(s)`);
            });

            fileParsers.push(p);
          }
        }

        Promise.all(fileParsers).then(_ => {
          Logger.Log(`Parsed all expected test results, updating tree`);

          this.sendNewTestResults({
            clearPreviousTestResults: this.waitForAllTests.clearPreviousTestResults,
            testResults: this.waitForAllTests.testResults
          });

          this.waitForAllTests.currentNumberOfFiles = 0;
          this.waitForAllTests.testsAlreadyRunning = false;
          this.waitForAllTests.testResults = [];
          this.waitForAllTests.clearPreviousTestResults = false;
        });
      } else {
        Logger.Log(`Reading test result files failed with error: ${err}`);
      }
    });

    const pattern = this.testResultsFolder.replace('\\', '/') + '/*/coverage.info';
    glob(pattern, (globError, coverageFiles) => {
      if (globError) {
        Logger.LogError('Unable to retrieve coverage result files', globError);
        return;
      }

      let latestCoverageFile: string | undefined;

      if (coverageFiles.length === 1) {
        latestCoverageFile = coverageFiles[0];
      } else if (coverageFiles.length > 1) {
        let latestTimestamp = fs.statSync(coverageFiles[0]).mtime;
        latestCoverageFile = coverageFiles[0];

        for (let i = 1; i < coverageFiles.length; ++i) {
          const timestamp = fs.statSync(coverageFiles[i]).mtime;

          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestCoverageFile = coverageFiles[i];
          }
        }
      }

      if (latestCoverageFile) {
        // tslint:disable-next-line: no-non-null-assertion
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const relativePath = Utility.getConfiguration().get<string>('coverageFilePath');
        let targetPath = workspaceRoot;

        if (relativePath) {
          this.ensureDirExists(workspaceRoot, relativePath);
          targetPath = path.join(workspaceRoot, relativePath);
        }

        targetPath = path.join(targetPath, 'lcov.info');

        fs.copyFile(latestCoverageFile, targetPath, err => {
          if (!err) {
            // drop all coverage files
            for (let i = 0; i < coverageFiles.length; ++i) {
              fs.unlinkSync(coverageFiles[i]);
            }
          } else {
            Logger.LogWarning('Coverage file could not be copied to workspace');
          }
        });
      }
    });
  }

  private setupTestResultFolder(): void {
    if (!this.testResultsFolder) {
      this.testResultsFolder = fs.mkdtempSync(path.join(Utility.pathForResultFile, 'test-explorer-'));
    }
  }

  private runTestCommand(testName: string, isSingleTest: boolean, collectCoverage: boolean, debug?: boolean): void {
    if (this.waitForAllTests.testsAlreadyRunning) {
      Logger.Log('Tests already running, ignore request to run tests for ' + testName);
      return;
    }

    commands.executeCommand('workbench.view.extension.test', 'workbench.view.extension.test');

    const testDirectories = this.testDirectories.getTestDirectories(testName);

    if (testDirectories.length < 1) {
      Logger.LogWarning('Could not find a matching test directory for test ' + testName);
      return;
    }

    this.waitForAllTests.testsAlreadyRunning = true;

    if (testName === '') {
      this.waitForAllTests.clearPreviousTestResults = true;
    }

    Logger.Log(`Test run for ${testName}`);

    for (const {} of testDirectories) {
      const testContext = { testName, isSingleTest, collectCoverage };
      this.lastRunTestContext = testContext;
      this.sendRunningTest(testContext);
    }

    const runSeqOrAsync = async () => {
      try {
        if (Utility.runInParallel) {
          await Promise.all(
            testDirectories.map(async (dir, i) =>
              this.runTestCommandForSpecificDirectory(dir, testName, isSingleTest, collectCoverage, debug)
            )
          );
        } else {
          for (let i = 0; i < testDirectories.length; i++) {
            await this.runTestCommandForSpecificDirectory(
              testDirectories[i],
              testName,
              isSingleTest,
              collectCoverage,
              debug
            );
          }
        }
      } catch (err) {
        Logger.Log(`Error while executing test command: ${err}`);
        this.discoverTests();
      }
    };

    runSeqOrAsync();
  }

  private runBuildCommandForSpecificDirectory(testDirectoryPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (Utility.skipBuild) {
        Logger.Log(`User has passed --no-build, skipping build`);
        resolve();
      } else {
        Logger.Log(`Executing dotnet build in ${testDirectoryPath}`);

        Executor.exec(
          'dotnet build',
          (err: any, _: string, stderr: string) => {
            if (err || stderr) {
              reject(new Error('Build command failed'));
            }
            resolve();
          },
          testDirectoryPath
        );
      }
    });
  }

  private runTestCommandForSpecificDirectory(
    testDirectoryPath: string,
    testName: string,
    isSingleTest: boolean,
    collectCoverage: boolean,
    debug?: boolean
  ): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
      let command =
        `dotnet test ${Utility.additionalArgumentsOption}` +
        ` --no-build --logger "trx" --results-directory "${this.testResultsFolder}"`;

      if (testName && testName.length) {
        if (isSingleTest) {
          command = command + ` --filter "FullyQualifiedName=${testName.replace(/\(.*\)/g, '')}"`;
        } else {
          command = command + ` --filter "FullyQualifiedName~${testName.replace(/\(.*\)/g, '')}"`;
        }
      }

      if (collectCoverage) {
        const rsTemplatePath = this.context.asAbsolutePath(path.join('resources', 'coverlet.runsettings'));

        const settingValue = Utility.getConfiguration().get<boolean>('includeTestAssemblyCoverage');
        const setting = settingValue !== undefined ? settingValue.toString() : 'false';
        const includeTestsInCoverage = setting.toString();
        const content = fs.readFileSync(rsTemplatePath, 'utf8').replace('INCLUDE_TESTS_TOKEN', includeTestsInCoverage);
        const runsettingsPath = path.join(this.testResultsFolder, 'coverlet.runsettings');
        fs.writeFileSync(runsettingsPath, content);

        command = command + ' --collect:"XPlat Code Coverage" --settings ' + runsettingsPath;
      }

      this.runBuildCommandForSpecificDirectory(testDirectoryPath)
        .then(() => {
          Logger.Log(`Executing ${command} in ${testDirectoryPath}`);

          if (!debug) {
            return Executor.exec(
              command,
              (err: any, stdout: string) => {
                if (err && err.killed) {
                  Logger.Log('User has probably cancelled test run');
                  reject(new Error('UserAborted'));
                }

                Logger.Log(stdout, 'Test Explorer (Test runner output)');

                resolve();
              },
              testDirectoryPath,
              true
            );
          } else {
            return Executor.debug(
              command,
              (err: any, stdout: string) => {
                if (err && err.killed) {
                  Logger.Log('User has probably cancelled test run');
                  reject(new Error('UserAborted'));
                }

                Logger.Log(stdout, 'Test Explorer (Test runner output)');

                resolve();
              },
              testDirectoryPath,
              true
            );
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  private ensureDirExists(rootDir: string, targetDir: string) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = rootDir;

    targetDir = path.normalize(targetDir);

    return targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);
      try {
        fs.mkdirSync(curDir);
      } catch (err) {
        if (err.code === 'EEXIST') {
          // curDir already exists!
          return curDir;
        }

        // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
        if (err.code === 'ENOENT') {
          // Throw the original parentDir error on curDir `ENOENT` failure.
          throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
        }

        const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
        if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
          throw err; // Throw if it's just the last created dir.
        }
      }

      return curDir;
    }, initDir);
  }

  private clearTempDirectory(dir: string) {
    if (fs.existsSync(this.testResultsFolder)) {
      fs.readdirSync(dir).forEach((child, _) => {
        const curPath = path.join(dir, child);
        if (fs.lstatSync(curPath).isDirectory()) {
          // recurse
          this.clearTempDirectory(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });

      fs.rmdirSync(dir);
    }
  }
}
