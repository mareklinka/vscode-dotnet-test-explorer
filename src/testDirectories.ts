import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';
import { Utility } from './utility';

export class TestDirectories {
  private directories: Array<string> = [];
  private testsForDirectory: Array<{ dir: string; name: string }> = [];

  public parseTestDirectories() {
    if (!vscode.workspace || !vscode.workspace.workspaceFolders) {
      return;
    }

    const testDirectoryGlob = Utility.getConfiguration().get<string>('testProjectPath');
    this.directories = [];

    const matchingDirs: Array<string> = [];

    vscode.workspace.workspaceFolders.forEach(folder => {
      const globPattern = folder.uri.fsPath.replace('\\', '/') + '/' + testDirectoryGlob;

      Logger.Log(`Finding projects for pattern ${globPattern}`);

      const matchingDirsForWorkspaceFolder = glob.sync(globPattern);

      matchingDirs.push(...matchingDirsForWorkspaceFolder);

      Logger.Log(`Found ${matchingDirsForWorkspaceFolder.length} matches for pattern in folder ${folder.uri.fsPath}`);
    });

    matchingDirs.forEach(dir => {
      Logger.Log(`Evaluating match ${dir}`);
      this.evaluateTestDirectory(dir);
    });
  }

  public addTestsForDirectory(testsForDirectory: Array<{ dir: string; name: string }>) {
    this.testsForDirectory = this.testsForDirectory.concat(testsForDirectory);
  }

  public clearTestsForDirectory() {
    this.testsForDirectory = [];
  }

  public getFirstTestForDirectory(directory: string): string {
    // tslint:disable-next-line: no-non-null-assertion
    return this.testsForDirectory.find(t => t.dir === directory)!.name;
  }

  public getTestDirectories(testName?: string): Array<string> {
    if (testName && testName !== '') {
      const dirForTestName = this.testsForDirectory.filter(t => t.name.startsWith(testName)).map(t => t.dir);

      return [...new Set(dirForTestName)];
    }

    return this.directories;
  }

  public removeTestDirectory(directory: string) {
    this.directories = this.directories.filter(dir => dir !== directory);
    Logger.LogWarning(`Removed directory ${directory} due to it not containting any tests`);
  }

  private evaluateTestDirectory(testProjectFullPath: string): void {
    if (!fs.existsSync(testProjectFullPath)) {
      Logger.LogWarning(`Path ${testProjectFullPath} is not valid`);
    } else {
      if (fs.lstatSync(testProjectFullPath).isFile()) {
        testProjectFullPath = path.dirname(testProjectFullPath);
      }

      if (glob.sync(`${testProjectFullPath}/+(*.csproj|*.sln|*.fsproj)`).length < 1) {
        Logger.LogWarning(
          `Skipping path ${testProjectFullPath} ` +
            'since it does not contain something we can build (.sln, .csproj, .fsproj)'
        );
      } else {
        Logger.Log(`Adding directory ${testProjectFullPath}`);
        this.directories.push(testProjectFullPath);
      }
    }
  }
}
